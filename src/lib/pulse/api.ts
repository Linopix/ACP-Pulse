/**
 * Serverfunktionen der Sendung.
 *
 * Eine Zeile in `playback` ist die gemeinsame Uhr. `advancePlayback` wählt den
 * nächsten Beitrag: Durchsage, Relais, Wunsch nach Score, sonst Hausplaylist.
 * `tryDispatch` schickt denselben Beitrag an Sonos oder den Receiver, wenn das
 * Ziel nicht der Browser ist. YouTube bleibt im Browser.
 *
 * Schreibende Wege laufen durch `withRadioLock`. Die reinen Entscheidungen
 * (Stimmen, Filter, Aufräumen) liegen in logic.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  MAX_OPEN_WISHES,
  clampKick,
  clampPruneAt,
  clampVolume,
  isBlocked,
  isDesk,
  nextSlot,
  outputLabel,
  parseWords,
  speechDurationMs,
  voteBudget,
  wishesToPrune,
  youtubeId,
  type DeskRole,
  type FilterMode,
  type OutputTarget,
} from "@/lib/pulse/logic";
import type {
  AdminSnapshot,
  AnnouncementRecord,
  DeskSnapshot,
  MemberRecord,
  OutputProbe,
  PlaybackView,
  PlaylistRecord,
  ProbeLine,
  QueueItem,
  RecordingRecord,
  RelaySlot,
  RelayStation,
  RuleInput,
  RuleRecord,
  SettingsRecord,
  StationSnapshot,
  TrackInput,
  TrackSource,
} from "@/lib/pulse/types";

type Row = Record<string, unknown>;

const SEEDS = [
  "Norah Jones Don't Know Why",
  "Khruangbin Friday Morning",
  "Fleetwood Mac Dreams",
  "Men I Trust Show Me How",
  "Tycho A Walk",
  "Corinne Bailey Rae Put Your Records On",
];

let radioLock: Promise<void> = Promise.resolve();
let lastDispatchAttempt = 0;

function withRadioLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = radioLock;
  let release: () => void = () => {};
  radioLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  return prev.then(fn, fn).finally(release);
}

function fail(message: string): never {
  throw new Error(message);
}

function asNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function asIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function clip(value: unknown, max: number): string {
  return asText(value).trim().slice(0, max);
}

function httpsUrl(value: unknown): string {
  const raw = clip(value, 500);
  if (!raw.startsWith("https://")) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function asFilter(value: unknown): FilterMode {
  if (value === "allow" || value === "clean" || value === "strict") return value;
  return "clean";
}

function asFilterOrNull(value: unknown): FilterMode | null {
  if (value == null || value === "") return null;
  if (value === "allow" || value === "clean" || value === "strict") return value;
  return null;
}

function asOutput(value: unknown): OutputTarget {
  if (value === "sonos" || value === "receiver" || value === "browser") return value;
  return "browser";
}

function asSource(value: unknown): TrackSource {
  if (value === "spotify" || value === "archive" || value === "youtube" || value === "link") return value;
  return "preview";
}

function asRole(value: unknown): DeskRole {
  if (value === "admin" || value === "dj") return value;
  return "listener";
}

function blockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.+$/, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "169.254.169.254" || host === "metadata.google.internal") return true;
  const parts = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!parts) return false;
  const a = Number(parts[1]);
  const b = Number(parts[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function publicHttps(value: string, max = 300): string {
  const raw = clip(value, max);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || url.username || url.password) return "";
  if (blockedHost(url.hostname)) return "";
  return url.toString();
}

function asVote(value: unknown): -1 | 0 | 1 {
  const n = asNum(value, 0);
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

function httpOrigin(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `http://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase();
    if (host === "169.254.169.254" || host === "metadata.google.internal") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function hostOnly(value: string): string {
  const raw = value.trim().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  const host = raw.slice(0, 120);
  if (!host || !/^[a-zA-Z0-9.\-:]+$/.test(host)) return "";
  if (host === "169.254.169.254") return "";
  return host;
}

function trackFrom(row: Row): TrackInput {
  return {
    title: asText(row.title),
    artist: asText(row.artist),
    album: asText(row.album),
    artworkUrl: httpsUrl(row.artwork_url),
    previewUrl: httpsUrl(row.preview_url),
    source: asSource(row.source),
    externalId: asText(row.external_id),
    explicit: asBool(row.explicit),
    durationMs: Math.max(0, asNum(row.duration_ms)),
  };
}

function parseTrack(input: unknown): TrackInput {
  if (!input || typeof input !== "object") fail("Ungültiger Titel.");
  const o = input as Record<string, unknown>;
  const title = clip(o.title, 140);
  const artist = clip(o.artist, 140);
  if (title.length < 1 || artist.length < 1) fail("Titel und Interpret fehlen.");
  const source = asSource(o.source);
  const durationMs = Math.max(0, Math.min(15 * 60_000, Math.round(asNum(o.durationMs))));
  return {
    title,
    artist,
    album: clip(o.album, 160),
    artworkUrl: httpsUrl(o.artworkUrl),
    previewUrl: source === "youtube" ? "" : httpsUrl(o.previewUrl),
    source,
    externalId: clip(o.externalId, 180),
    explicit: o.explicit === true,
    durationMs,
  };
}

function playDuration(row: Row, preview: string): number {
  const stored = asNum(row.duration_ms);
  if (stored > 0) return stored;
  if (row.source === "youtube") return 180_000;
  if (row.source === "archive" || row.source === "link") return preview ? 180_000 : 12_000;
  return preview ? 30_000 : 12_000;
}

async function loadIdentity(sql: Sql, userId: string) {
  const rows = await sql<Row>`select "name", "email" from "user" where "id" = ${userId} limit 1`;
  const email = asText(rows[0]?.email);
  const name = clip(rows[0]?.name, 80) || email.split("@")[0] || "Team";
  return { name, email };
}

async function ensureMember(sql: Sql, userId: string, name: string) {
  await sql`
    insert into members (user_id, display_name, role)
    values (${userId}, ${name}, 'listener')
    on conflict (user_id) do nothing
  `;
  await sql`
    update members set role = 'admin'
    where user_id = ${userId}
      and not exists (select 1 from members where role = 'admin')
  `;
  const rows = await sql<Row>`select user_id, display_name, role from members where user_id = ${userId}`;
  const row = rows[0];
  if (!row) fail("Profil fehlt.");
  return {
    id: userId,
    name: asText(row.display_name) || name,
    role: asRole(row.role),
  };
}

async function requireAdmin(sql: Sql, userId: string) {
  const identity = await loadIdentity(sql, userId);
  const member = await ensureMember(sql, userId, identity.name);
  if (member.role !== "admin") fail("Nur die Regie darf das.");
  return { ...member, email: identity.email };
}

async function requireDesk(sql: Sql, userId: string) {
  const identity = await loadIdentity(sql, userId);
  const member = await ensureMember(sql, userId, identity.name);
  if (!isDesk(member.role)) fail("Das Pult ist für DJs und die Regie.");
  return { ...member, email: identity.email };
}

type Effective = SettingsRecord & { activeRule: StationSnapshot["activeRule"] };

function mapSettings(row: Row): SettingsRecord {
  return {
    wishesEnabled: asBool(row.wishes_enabled),
    explicitFilter: asFilter(row.explicit_filter),
    volume: clampVolume(asNum(row.volume, 42)),
    outputTarget: asOutput(row.output_target),
    sonosRoom: asText(row.sonos_room),
    sonosHost: asText(row.sonos_host),
    receiverUrl: asText(row.receiver_url),
    downvoteKick: clampKick(asNum(row.downvote_kick, 3)),
    wishPrune: row.wish_prune === "off" ? "off" : "auto",
    wishPruneAt: clampPruneAt(asNum(row.wish_prune_at, 8)),
    extraBlocklist: asText(row.extra_blocklist),
    musicSource: row.music_source === "spotify" ? "spotify" : row.music_source === "archive" ? "archive" : "preview",
    spotifyClientId: asText(row.spotify_client_id),
    moderatorEnabled: asBool(row.moderator_enabled),
    moderatorSlots: asText(row.moderator_slots) || "09:00,12:30,16:00",
    moderatorTopics: asText(row.moderator_topics) || "firma,tech",
    companyNotes: asText(row.company_notes),
    monitorExternal: asBool(row.monitor_external),
  };
}

async function loadEffective(sql: Sql): Promise<Effective> {
  const settingsRows = await sql<Row>`select * from station_settings where id = 1`;
  const base = mapSettings(settingsRows[0] ?? {});
  const rules = await sql<Row>`
    select * from calendar_rules
    where starts_at <= now() and ends_at >= now()
    order by starts_at desc
    limit 1
  `;
  const rule = rules[0];
  if (!rule) return { ...base, activeRule: null };
  const volume = rule.volume == null ? base.volume : clampVolume(asNum(rule.volume));
  const wishes = rule.wishes_enabled == null ? base.wishesEnabled : asBool(rule.wishes_enabled);
  const filter = asFilterOrNull(rule.explicit_filter) ?? base.explicitFilter;
  return {
    ...base,
    volume,
    wishesEnabled: wishes,
    explicitFilter: filter,
    activeRule: {
      id: asNum(rule.id),
      title: asText(rule.title),
      endsAt: asIso(rule.ends_at) ?? new Date().toISOString(),
      note: asText(rule.note),
    },
  };
}

async function searchItunes(query: string): Promise<TrackInput[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", query);
  url.searchParams.set("entity", "song");
  url.searchParams.set("media", "music");
  url.searchParams.set("limit", "8");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) fail("Die Musiksuche ist gerade nicht erreichbar.");
  const body = (await res.json()) as {
    results?: {
      trackName?: string;
      artistName?: string;
      collectionName?: string;
      artworkUrl100?: string;
      previewUrl?: string;
      trackId?: number;
      trackExplicitness?: string;
    }[];
  };
  return (body.results ?? [])
    .map((hit) => {
      const art = hit.artworkUrl100?.replace("100x100bb", "300x300bb") ?? "";
      return {
        title: clip(hit.trackName, 140),
        artist: clip(hit.artistName, 140),
        album: clip(hit.collectionName, 160),
        artworkUrl: httpsUrl(art),
        previewUrl: httpsUrl(hit.previewUrl),
        source: "preview" as const,
        externalId: hit.trackId ? String(hit.trackId) : "",
        explicit: hit.trackExplicitness === "explicit",
        durationMs: hit.previewUrl ? 30_000 : 0,
      };
    })
    .filter((hit) => hit.title && hit.artist);
}

let catalogAttemptAt = 0;

async function bootstrapPlaylist(sql: Sql, userId: string) {
  const fallback = await sql<Row>`select id from playlists where is_fallback = true order by id asc limit 1`;
  let playlistId = asNum(fallback[0]?.id);
  if (!playlistId) {
    const any = await sql<Row>`select id from playlists order by id asc limit 1`;
    playlistId = asNum(any[0]?.id);
    if (playlistId) await sql`update playlists set is_fallback = true where id = ${playlistId}`;
  }
  if (!playlistId) {
    const inserted = await sql<Row>`
      insert into playlists (name, is_fallback, created_by)
      values ('Hausplaylist', true, ${userId})
      returning id
    `;
    playlistId = asNum(inserted[0]?.id);
  }
  if (!playlistId) return;

  const count = await sql<Row>`select count(*)::int as n from playlist_tracks where playlist_id = ${playlistId}`;
  if (asNum(count[0]?.n) === 0 && Date.now() - catalogAttemptAt > 60_000) {
    catalogAttemptAt = Date.now();
    const batches = await Promise.all(
      SEEDS.map(async (term) => {
        try {
          return await searchItunes(term);
        } catch {
          return [];
        }
      }),
    );
    let position = 0;
    for (const hits of batches) {
      const hit =
        hits.find((item) => item.previewUrl && !item.explicit) ??
        hits.find((item) => item.previewUrl) ??
        null;
      if (!hit) continue;
      position += 1;
      await sql`
        insert into playlist_tracks (
          playlist_id, title, artist, album, artwork_url, preview_url, source, external_id, explicit, position
        ) values (
          ${playlistId}, ${hit.title}, ${hit.artist}, ${hit.album}, ${hit.artworkUrl},
          ${hit.previewUrl}, ${hit.source}, ${hit.externalId}, ${hit.explicit}, ${position}
        )
      `;
    }
  }
  await seedOpeningQueue(sql, playlistId);
}

/** Einmalig, damit eine einzelne Person das Voting sofort ausprobieren kann. */
async function seedOpeningQueue(sql: Sql, playlistId: number) {
  const total = await sql<Row>`select count(*)::int as n from queue_items`;
  if (asNum(total[0]?.n) > 0) return;
  const tracks = await sql<Row>`
    select * from playlist_tracks
    where playlist_id = ${playlistId} and preview_url <> '' and explicit = false
    order by position asc, id asc
    limit 5
  `;
  for (const row of tracks) {
    await sql`
      insert into queue_items (
        title, artist, album, artwork_url, preview_url, source, external_id, explicit, duration_ms,
        added_by, added_by_name, status, score, upvotes, downvotes
      ) values (
        ${asText(row.title)}, ${asText(row.artist)}, ${asText(row.album)}, ${httpsUrl(row.artwork_url)},
        ${httpsUrl(row.preview_url)}, ${asSource(row.source)}, ${asText(row.external_id)},
        false, ${asNum(row.duration_ms)}, 'redaktion', 'Redaktion', 'queued', 0, 0, 0
      )
    `;
  }
}

async function readPlayback(sql: Sql) {
  const rows = await sql<Row>`select * from playback where id = 1`;
  return rows[0] ?? {};
}

function playbackDue(row: Row): boolean {
  const started = asIso(row.started_at);
  if (!started) return true;
  return Date.now() - new Date(started).getTime() >= asNum(row.duration_ms, 0) - 250;
}

async function waitingAnnouncement(sql: Sql): Promise<boolean> {
  const rows = await sql<Row>`
    select count(*)::int as n from announcements
    where status = 'queued' and (air_at is null or air_at <= now())
  `;
  return asNum(rows[0]?.n) > 0;
}

async function startAnnouncement(sql: Sql, row: Row) {
  const id = asNum(row.id);
  const body = asText(row.body);
  let duration = speechDurationMs(body);
  const recordingId = row.recording_id == null ? null : asNum(row.recording_id);
  if (recordingId) {
    const clips = await sql<Row>`select duration_ms from recordings where id = ${recordingId}`;
    const ms = asNum(clips[0]?.duration_ms);
    if (ms > 0) duration = ms;
  }
  await sql`update announcements set status = 'live' where id = ${id}`;
  await sql`
    update playback set
      mode = 'announcement',
      queue_item_id = null,
      playlist_track_id = null,
      announcement_id = ${id},
      relay_slot_id = null,
      started_at = now(),
      duration_ms = ${duration},
      dispatch_key = ''
    where id = 1
  `;
}

type RelayHit = {
  id: number;
  title: string;
  name: string;
  stream_url: string;
  starts_at: unknown;
  ends_at: unknown;
};

async function loadActiveRelay(sql: Sql): Promise<RelayHit | null> {
  const rows = await sql<Row>`
    select r.id, r.title, r.starts_at, r.ends_at, s.name, s.stream_url
    from relay_slots r
    join relay_stations s on s.id = r.station_id
    where r.starts_at <= now() and r.ends_at > now()
    order by r.starts_at desc
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: asNum(row.id),
    title: asText(row.title),
    name: asText(row.name),
    stream_url: asText(row.stream_url),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  };
}

async function startRelay(sql: Sql, relay: RelayHit) {
  const startMs = new Date(asIso(relay.starts_at) ?? Date.now()).getTime();
  const endMs = new Date(asIso(relay.ends_at) ?? Date.now()).getTime();
  await sql`
    update playback set
      mode = 'relay',
      queue_item_id = null,
      playlist_track_id = null,
      announcement_id = null,
      relay_slot_id = ${relay.id},
      started_at = ${asIso(relay.starts_at)},
      duration_ms = ${Math.max(5000, endMs - startMs)},
      dispatch_key = ''
    where id = 1
  `;
}

/** Nächster Beitrag. `force` beendet den aktuellen sofort, `interrupt` schiebt ihn zurück in die Queue. */
async function advancePlayback(sql: Sql, opts?: { force?: boolean; interrupt?: boolean }) {
  await pruneWeakWishes(sql);
  let pb = await readPlayback(sql);
  let relay = await loadActiveRelay(sql);
  const waiting = await waitingAnnouncement(sql);
  let mode = asText(pb.mode);

  if (opts?.force === true && mode === "relay") {
    const slotId = asNum(pb.relay_slot_id);
    if (slotId) await sql`update relay_slots set ends_at = now() where id = ${slotId}`;
    relay = null;
  }

  const idle = mode === "idle" || mode === "";
  const onRelay = Boolean(relay) && mode === "relay" && asNum(pb.relay_slot_id) === relay?.id;
  const due = playbackDue(pb) || opts?.force === true || idle || (mode === "relay" && !relay);
  const annCut = opts?.interrupt === true || (waiting && mode !== "announcement");
  const relayCut = Boolean(relay) && !onRelay && mode !== "announcement" && !annCut;

  if (onRelay && !annCut && opts?.force !== true && opts?.interrupt !== true) {
    await tryDispatch(sql);
    return;
  }
  if (!due && !annCut && !relayCut) {
    await tryDispatch(sql);
    return;
  }

  const queueId = pb.queue_item_id == null ? null : asNum(pb.queue_item_id);
  const annId = pb.announcement_id == null ? null : asNum(pb.announcement_id);
  const park = !due && (annCut || relayCut);

  if (park) {
    if (mode === "track" && queueId) {
      await sql`
        update queue_items set status = 'queued'
        where id = ${queueId} and status = 'playing'
      `;
    }
    if (mode === "fallback") {
      await sql`update playback set fallback_cursor = greatest(0, fallback_cursor - 1) where id = 1`;
    }
    if (mode === "announcement" && annId && annCut) {
      await sql`update announcements set status = 'done', played_at = now() where id = ${annId}`;
    }
  } else {
    if (mode === "track" && queueId) {
      await sql`
        update queue_items set status = 'played', played_at = now()
        where id = ${queueId} and status = 'playing'
      `;
    }
    if (mode === "announcement" && annId) {
      await sql`
        update announcements set status = 'done', played_at = now()
        where id = ${annId} and status = 'live'
      `;
    }
  }

  pb = await readPlayback(sql);
  const effective = await loadEffective(sql);
  const extra = parseWords(effective.extraBlocklist);

  const anns = await sql<Row>`
    select * from announcements
    where status = 'queued' and (air_at is null or air_at <= now())
    order by created_at asc
    limit 1
  `;
  if (anns[0]) {
    await startAnnouncement(sql, anns[0]);
    await tryDispatch(sql);
    return;
  }

  if (relay) {
    await startRelay(sql, relay);
    await tryDispatch(sql);
    return;
  }

  const queued = await sql<Row>`
    select * from queue_items
    where status = 'queued'
    order by score desc, created_at asc, id asc
  `;
  const next = queued.find((row) => !isBlocked(trackFrom(row), effective.explicitFilter, extra));
  if (next) {
    const id = asNum(next.id);
    await sql`
      update queue_items set status = 'played', played_at = now()
      where status = 'playing' and id <> ${id}
    `;
    await sql`update queue_items set status = 'playing' where id = ${id}`;
    const preview = httpsUrl(next.preview_url);
    await sql`
      update playback set
        mode = 'track',
        queue_item_id = ${id},
        playlist_track_id = null,
        announcement_id = null,
        relay_slot_id = null,
        started_at = now(),
        duration_ms = ${playDuration(next, preview)},
        dispatch_key = ''
      where id = 1
    `;
    await tryDispatch(sql);
    return;
  }

  const tracks = await sql<Row>`
    select t.* from playlist_tracks t
    join playlists p on p.id = t.playlist_id
    where p.is_fallback = true
    order by t.position asc, t.id asc
  `;
  const playable = tracks.filter((row) => !isBlocked(trackFrom(row), effective.explicitFilter, extra));
  if (playable.length === 0) {
    if (idle && !opts?.force && !annCut) return;
    await sql`
      update playback set
        mode = 'idle',
        queue_item_id = null,
        playlist_track_id = null,
        announcement_id = null,
        relay_slot_id = null,
        started_at = now(),
        duration_ms = 6000,
        dispatch_key = ''
      where id = 1
    `;
    return;
  }
  const cursor = asNum(pb.fallback_cursor);
  const index = ((cursor % playable.length) + playable.length) % playable.length;
  const track = playable[index]!;
  const trackId = asNum(track.id);
  const preview = httpsUrl(track.preview_url);
  await sql`
    update playback set
      mode = 'fallback',
      queue_item_id = null,
      playlist_track_id = ${trackId},
      announcement_id = null,
      relay_slot_id = null,
      started_at = now(),
      duration_ms = ${playDuration(track, preview)},
      fallback_cursor = ${cursor + 1},
      dispatch_key = ''
    where id = 1
  `;
  await tryDispatch(sql);
}

/** Ein Play pro Beitrag. Fehlschlag lässt die Browser-Sendung weiterlaufen. */
async function tryDispatch(sql: Sql) {
  const settings = await loadEffective(sql);
  if (settings.outputTarget === "browser" || !settings.receiverUrl) return;
  const pb = await readPlayback(sql);
  const mode = asText(pb.mode);
  if (mode !== "track" && mode !== "fallback" && mode !== "announcement" && mode !== "relay") return;
  const key = [
    mode,
    asText(pb.queue_item_id),
    asText(pb.playlist_track_id),
    asText(pb.announcement_id),
    asText(pb.relay_slot_id),
    asIso(pb.started_at) ?? "",
  ].join(":");
  if (asText(pb.dispatch_key) === key) return;
  if (Date.now() - lastDispatchAttempt < 8000) return;
  lastDispatchAttempt = Date.now();
  const now = await buildNow(sql, pb);
  try {
    const res = await fetch(new URL("/v1/play", settings.receiverUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: now.mode,
        url: now.audioUrl,
        title: now.title,
        artist: now.subtitle,
        text: now.announcementBody,
        volume: settings.volume,
        room: settings.sonosRoom,
        output: settings.outputTarget,
        sonosHost: settings.sonosHost,
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return;
    await sql`update playback set dispatch_key = ${key} where id = 1`;
  } catch {
    // Nächster Takt versucht es erneut. Die Sendung im Browser läuft weiter.
  }
}

async function buildNow(sql: Sql, pb: Row): Promise<PlaybackView> {
  const mode = asText(pb.mode);
  const startedAt = asIso(pb.started_at);
  const durationMs = asNum(pb.duration_ms, 30000);
  const base = {
    startedAt,
    durationMs,
    announcementBody: "",
    explicit: false,
    live: false,
    youtubeId: "",
    recordingId: null as number | null,
  };
  if (mode === "announcement" && pb.announcement_id != null) {
    const rows = await sql<Row>`select * from announcements where id = ${asNum(pb.announcement_id)}`;
    const row = rows[0];
    const title = asText(row?.title) || "Durchsage";
    const recordingId = row?.recording_id == null ? null : asNum(row.recording_id);
    const kind = asText(row?.kind);
    return {
      ...base,
      mode: "announcement",
      key: `announcement:${asText(pb.announcement_id)}:${startedAt}`,
      title,
      subtitle: asText(row?.created_by_name) || "Pult",
      artworkUrl: "",
      audioUrl: "",
      announcementBody: recordingId ? "" : asText(row?.body),
      via: kind === "moderator" ? "Moderation" : kind === "mic" ? "Mikrofon" : "Durchsage",
      recordingId,
    };
  }
  if (mode === "relay" && pb.relay_slot_id != null) {
    const rows = await sql<Row>`
      select r.title, r.starts_at, s.name, s.stream_url
      from relay_slots r
      join relay_stations s on s.id = r.station_id
      where r.id = ${asNum(pb.relay_slot_id)}
    `;
    const row = rows[0];
    if (row) {
      const stream = publicHttps(asText(row.stream_url));
      return {
        ...base,
        mode: "relay",
        key: `relay:${asText(pb.relay_slot_id)}:${startedAt}`,
        title: asText(row.title) || asText(row.name),
        subtitle: asText(row.name),
        artworkUrl: "",
        audioUrl: stream,
        via: "Live aus dem Radio",
        live: true,
      };
    }
  }
  if (mode === "track" && pb.queue_item_id != null) {
    const rows = await sql<Row>`select * from queue_items where id = ${asNum(pb.queue_item_id)}`;
    const row = rows[0];
    if (row) {
      const track = trackFrom(row);
      const youtube = track.source === "youtube" ? track.externalId : "";
      return {
        ...base,
        mode: "track",
        key: `track:${asText(row.id)}:${startedAt}`,
        title: track.title,
        subtitle: track.artist,
        artworkUrl: track.artworkUrl,
        audioUrl: youtube ? "" : track.previewUrl,
        via: `Wunsch von ${asText(row.added_by_name) || "jemandem"}`,
        explicit: track.explicit,
        youtubeId: youtube,
      };
    }
  }
  if (mode === "fallback" && pb.playlist_track_id != null) {
    const rows = await sql<Row>`
      select t.*, p.name as playlist_name
      from playlist_tracks t
      join playlists p on p.id = t.playlist_id
      where t.id = ${asNum(pb.playlist_track_id)}
    `;
    const row = rows[0];
    if (row) {
      const track = trackFrom(row);
      return {
        ...base,
        mode: "fallback",
        key: `fallback:${asText(row.id)}:${startedAt}`,
        title: track.title,
        subtitle: track.artist,
        artworkUrl: track.artworkUrl,
        audioUrl: track.previewUrl,
        via: asText(row.playlist_name) || "Hausplaylist",
        explicit: track.explicit,
      };
    }
  }
  return {
    ...base,
    mode: "idle",
    key: `idle:${startedAt ?? "0"}`,
    title: "Sendepause",
    subtitle: "Gerade ist nichts Freigegebenes in der Queue oder Hausplaylist.",
    artworkUrl: "",
    audioUrl: "",
    via: "Programm",
  };
}

async function buildSnapshot(sql: Sql, userId: string, memberName: string, email: string, role: DeskRole): Promise<StationSnapshot> {
  const effective = await loadEffective(sql);
  const extra = parseWords(effective.extraBlocklist);
  const pb = await readPlayback(sql);
  const now = await buildNow(sql, pb);
  const queueRows = await sql<Row>`
    select q.*, coalesce(v.value, 0) as my_vote
    from queue_items q
    left join votes v on v.queue_item_id = q.id and v.user_id = ${userId}
    where q.status = 'queued'
    order by q.score desc, q.created_at asc, q.id asc
  `;
  const queue: QueueItem[] = queueRows.map((row) => {
    const track = trackFrom(row);
    return {
      ...track,
      id: asNum(row.id),
      addedByName: asText(row.added_by_name),
      mine: asText(row.added_by) === userId,
      status: "queued",
      score: asNum(row.score),
      upvotes: asNum(row.upvotes),
      downvotes: asNum(row.downvotes),
      myVote: asVote(row.my_vote),
      blocked: isBlocked(track, effective.explicitFilter, extra),
      createdAt: asIso(row.created_at) ?? new Date().toISOString(),
    };
  });
  const used = await sql<Row>`
    select
      coalesce(sum(case when v.value = 1 then 1 else 0 end), 0)::int as up_used,
      coalesce(sum(case when v.value = -1 then 1 else 0 end), 0)::int as down_used
    from votes v
    join queue_items q on q.id = v.queue_item_id
    where v.user_id = ${userId} and q.status = 'queued'
  `;
  const open = await sql<Row>`
    select count(*)::int as n from queue_items
    where added_by = ${userId} and status in ('queued', 'playing')
  `;
  const historyRows = await sql<Row>`
    select title, artist, played_at from queue_items
    where status = 'played' and played_at is not null
    order by played_at desc
    limit 5
  `;
  const lists = await sql<Row>`select name from playlists where is_fallback = true limit 1`;
  const budgetBase = voteBudget(queue.length);
  const relay = await loadActiveRelay(sql);
  return {
    me: { id: userId, name: memberName, email, role },
    wishesEnabled: effective.wishesEnabled,
    explicitFilter: effective.explicitFilter,
    volume: effective.volume,
    outputTarget: effective.outputTarget,
    outputLabel: outputLabel(effective.outputTarget, effective.sonosRoom),
    receiverConfigured: effective.receiverUrl.length > 0,
    musicSource: effective.musicSource,
    downvoteKick: effective.downvoteKick,
    wishPrune: effective.wishPrune,
    wishPruneAt: effective.wishPruneAt,
    monitorExternal: effective.monitorExternal,
    activeRule: effective.activeRule,
    relay: relay
      ? {
          title: relay.title || relay.name,
          stationName: relay.name,
          endsAt: asIso(relay.ends_at) ?? new Date().toISOString(),
        }
      : null,
    now,
    queue,
    history: historyRows.map((row) => ({
      title: asText(row.title),
      artist: asText(row.artist),
      at: asIso(row.played_at) ?? "",
    })),
    budget: {
      up: budgetBase.up,
      down: budgetBase.down,
      upUsed: asNum(used[0]?.up_used),
      downUsed: asNum(used[0]?.down_used),
      queueLength: queue.length,
    },
    openWishes: asNum(open[0]?.n),
    fallbackName: asText(lists[0]?.name) || "Hausplaylist",
  };
}

async function sessionSnapshot(sql: Sql, userId: string) {
  const identity = await loadIdentity(sql, userId);
  const member = await ensureMember(sql, userId, identity.name);
  await bootstrapPlaylist(sql, userId);
  await bootstrapStations(sql, userId);
  await advancePlayback(sql);
  return buildSnapshot(sql, userId, member.name, identity.email, member.role);
}

/** Stimmen neu zählen. Genug Runter und mehr Runter als Hoch setzt den Titel auf `kicked`. */
async function refreshScores(sql: Sql, itemId: number, kickAt: number) {
  await sql`
    update queue_items q set
      upvotes = (select count(*)::int from votes v where v.queue_item_id = q.id and v.value = 1),
      downvotes = (select count(*)::int from votes v where v.queue_item_id = q.id and v.value = -1),
      score = (select coalesce(sum(v.value), 0)::int from votes v where v.queue_item_id = q.id)
    where q.id = ${itemId}
  `;
  const rows = await sql<Row>`select status, upvotes, downvotes from queue_items where id = ${itemId}`;
  const row = rows[0];
  if (!row) return;
  const down = asNum(row.downvotes);
  const up = asNum(row.upvotes);
  if (down >= kickAt && down > up && (asText(row.status) === "queued" || asText(row.status) === "playing")) {
    await sql`update queue_items set status = 'kicked' where id = ${itemId}`;
    await sql`
      update playback set duration_ms = 0
      where id = 1 and queue_item_id = ${itemId}
    `;
  }
}

/** Wendet wishesToPrune an. Manuell ignoriert Grenze und Schonfrist. Ergebnisstatus: `pruned`. */
async function pruneWeakWishes(sql: Sql, opts?: { manual?: boolean }): Promise<number> {
  const settings = await loadBaseSettings(sql);
  const rows = await sql<Row>`
    select id, upvotes, downvotes, created_at from queue_items where status = 'queued'
  `;
  const pb = await readPlayback(sql);
  const playing = pb.queue_item_id == null ? 0 : asNum(pb.queue_item_id);
  const ids = wishesToPrune(
    rows.map((row) => ({
      id: asNum(row.id),
      upvotes: asNum(row.upvotes),
      downvotes: asNum(row.downvotes),
      createdAt: new Date(asIso(row.created_at) ?? 0).getTime(),
      playing: asNum(row.id) === playing,
    })),
    { mode: settings.wishPrune, threshold: settings.wishPruneAt, manual: opts?.manual === true },
  );
  for (const id of ids) {
    await sql`update queue_items set status = 'pruned' where id = ${id} and status = 'queued'`;
  }
  return ids.length;
}

let suggestedCache: { at: number; value: string } | null = null;

async function suggestedReceiver(): Promise<string> {
  if (suggestedCache && Date.now() - suggestedCache.at < 5000) return suggestedCache.value;
  const fromEnv = httpOrigin((process.env.PULSE_RECEIVER_URL ?? "").trim());
  let value = fromEnv;
  const allowLocal = !process.env.VERCEL && !process.env.KUBERNETES_SERVICE_HOST;
  if (!value && allowLocal) {
    try {
      const res = await fetch("http://127.0.0.1:8090/v1/health", { signal: AbortSignal.timeout(300) });
      if (res.ok) value = "http://127.0.0.1:8090";
    } catch {
      value = "";
    }
  }
  suggestedCache = { at: Date.now(), value };
  return value;
}

function parseSettings(input: unknown): SettingsRecord {
  if (!input || typeof input !== "object") fail("Einstellungen unvollständig.");
  const o = input as Record<string, unknown>;
  const slots = clip(o.moderatorSlots, 80);
  if (slots && !/^\d{2}:\d{2}(\s*,\s*\d{2}:\d{2})*$/.test(slots)) {
    fail("Slots als Uhrzeiten, z. B. 09:00, 12:30, 16:00.");
  }
  return {
    wishesEnabled: o.wishesEnabled === true,
    explicitFilter: asFilter(o.explicitFilter),
    volume: clampVolume(asNum(o.volume, 42)),
    outputTarget: asOutput(o.outputTarget),
    sonosRoom: clip(o.sonosRoom, 80),
    sonosHost: hostOnly(clip(o.sonosHost, 120)),
    receiverUrl: httpOrigin(clip(o.receiverUrl, 200)),
    downvoteKick: clampKick(asNum(o.downvoteKick, 3)),
    wishPrune: o.wishPrune === "off" ? "off" : "auto",
    wishPruneAt: clampPruneAt(asNum(o.wishPruneAt, 8)),
    extraBlocklist: parseWords(clip(o.extraBlocklist, 400)).join(", "),
    musicSource: o.musicSource === "spotify" ? "spotify" : o.musicSource === "archive" ? "archive" : "preview",
    spotifyClientId: clip(o.spotifyClientId, 80).replace(/[^\w-]/g, ""),
    moderatorEnabled: o.moderatorEnabled === true,
    moderatorSlots: slots || "09:00,12:30,16:00",
    moderatorTopics: parseWords(clip(o.moderatorTopics, 80))
      .filter((topic) => topic === "lokal" || topic === "firma" || topic === "tech")
      .join(","),
    companyNotes: clip(o.companyNotes, 2000),
    monitorExternal: o.monitorExternal === true,
  };
}

function parseRule(input: unknown): RuleInput {
  if (!input || typeof input !== "object") fail("Regel unvollständig.");
  const o = input as Record<string, unknown>;
  const title = clip(o.title, 80);
  const startsAt = asIso(o.startsAt);
  const endsAt = asIso(o.endsAt);
  if (title.length < 2) fail("Die Regel braucht einen Namen.");
  if (!startsAt || !endsAt) fail("Beginn und Ende fehlen.");
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) fail("Das Ende liegt vor dem Beginn.");
  const volume = o.volume == null || o.volume === "" ? null : clampVolume(asNum(o.volume));
  return {
    id: o.id == null ? undefined : asNum(o.id),
    title,
    startsAt,
    endsAt,
    volume,
    wishesEnabled: o.wishesEnabled == null ? null : o.wishesEnabled === true,
    explicitFilter: asFilterOrNull(o.explicitFilter),
    note: clip(o.note, 240),
  };
}

async function loadAdmin(sql: Sql, userId: string): Promise<AdminSnapshot> {
  const settings = await loadBaseSettings(sql);
  const rules = await sql<Row>`select * from calendar_rules order by starts_at asc`;
  const now = Date.now();
  const playlists = await sql<Row>`select * from playlists order by is_fallback desc, name asc`;
  const tracks = await sql<Row>`select * from playlist_tracks order by position asc, id asc`;
  const members = await sql<Row>`
    select m.user_id, m.display_name, m.role, u.email
    from members m
    left join "user" u on u."id" = m.user_id
    order by m.created_at asc
  `;
  const anns = await sql<Row>`
    select * from announcements order by created_at desc limit 12
  `;
  const stations = await loadStations(sql);
  const slots = await loadSlots(sql);
  const byPlaylist = new Map<number, PlaylistRecord["tracks"]>();
  for (const row of tracks) {
    const pid = asNum(row.playlist_id);
    const list = byPlaylist.get(pid) ?? [];
    list.push({ ...trackFrom(row), id: asNum(row.id), position: asNum(row.position) });
    byPlaylist.set(pid, list);
  }
  const slot = nextSlot(settings.moderatorSlots);
  return {
    settings,
    rules: rules.map((row) => {
      const startsAt = asIso(row.starts_at) ?? "";
      const endsAt = asIso(row.ends_at) ?? "";
      const startMs = new Date(startsAt).getTime();
      const endMs = new Date(endsAt).getTime();
      return {
        id: asNum(row.id),
        title: asText(row.title),
        startsAt,
        endsAt,
        volume: row.volume == null ? null : clampVolume(asNum(row.volume)),
        wishesEnabled: row.wishes_enabled == null ? null : asBool(row.wishes_enabled),
        explicitFilter: asFilterOrNull(row.explicit_filter),
        note: asText(row.note),
        active: startMs <= now && endMs >= now,
      } satisfies RuleRecord;
    }),
    playlists: playlists.map((row) => ({
      id: asNum(row.id),
      name: asText(row.name),
      isFallback: asBool(row.is_fallback),
      tracks: byPlaylist.get(asNum(row.id)) ?? [],
    })),
    members: members.map((row) => ({
      userId: asText(row.user_id),
      displayName: asText(row.display_name),
      email: asText(row.email),
      role: asRole(row.role),
      mine: asText(row.user_id) === userId,
    })) satisfies MemberRecord[],
    announcements: anns.map((row) => ({
      id: asNum(row.id),
      kind: asText(row.kind),
      title: asText(row.title),
      body: asText(row.body),
      status: asText(row.status),
      airAt: asIso(row.air_at),
      createdByName: asText(row.created_by_name),
      createdAt: asIso(row.created_at) ?? "",
    })) satisfies AnnouncementRecord[],
    stations,
    slots,
    nextSlot: slot ? slot.toISOString() : null,
    suggestedReceiver: await suggestedReceiver(),
  };
}

async function loadBaseSettings(sql: Sql): Promise<SettingsRecord> {
  const rows = await sql<Row>`select * from station_settings where id = 1`;
  return mapSettings(rows[0] ?? {});
}

const SEEDED_STATIONS: [string, string, string][] = [
  ["Deutschlandfunk", "https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3", "Nachrichten und Aktuelles"],
  ["Deutschlandfunk Kultur", "https://st02.sslstream.dlf.de/dlf/02/128/mp3/stream.mp3", "Kultur"],
  ["Deutschlandfunk Nova", "https://st03.sslstream.dlf.de/dlf/03/128/mp3/stream.mp3", "Wissen"],
];

async function bootstrapStations(sql: Sql, userId: string) {
  const existing = await sql<Row>`select count(*)::int as n from relay_stations`;
  if (asNum(existing[0]?.n) > 0) return;
  for (const [name, streamUrl, note] of SEEDED_STATIONS) {
    await sql`
      insert into relay_stations (name, stream_url, note, created_by)
      values (${name}, ${streamUrl}, ${note}, ${userId})
    `;
  }
}

async function loadStations(sql: Sql): Promise<RelayStation[]> {
  const rows = await sql<Row>`select * from relay_stations order by name asc`;
  return rows.map((row) => ({
    id: asNum(row.id),
    name: asText(row.name),
    streamUrl: asText(row.stream_url),
    note: asText(row.note),
  }));
}

async function loadSlots(sql: Sql): Promise<RelaySlot[]> {
  const rows = await sql<Row>`
    select r.*, s.name as station_name
    from relay_slots r
    join relay_stations s on s.id = r.station_id
    order by r.starts_at asc
  `;
  const now = Date.now();
  return rows.map((row) => {
    const startsAt = asIso(row.starts_at) ?? "";
    const endsAt = asIso(row.ends_at) ?? "";
    return {
      id: asNum(row.id),
      stationId: asNum(row.station_id),
      stationName: asText(row.station_name),
      title: asText(row.title),
      startsAt,
      endsAt,
      active: new Date(startsAt).getTime() <= now && new Date(endsAt).getTime() > now,
    };
  });
}

async function loadRecordings(sql: Sql): Promise<RecordingRecord[]> {
  const rows = await sql<Row>`
    select id, title, mime, duration_ms, created_by_name, created_at
    from recordings
    order by created_at desc
    limit 30
  `;
  return rows.map((row) => ({
    id: asNum(row.id),
    title: asText(row.title),
    mime: asText(row.mime),
    durationMs: asNum(row.duration_ms),
    createdByName: asText(row.created_by_name),
    createdAt: asIso(row.created_at) ?? "",
  }));
}

async function searchArchive(query: string): Promise<TrackInput[]> {
  const phrase = query
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (phrase.length < 2) fail("Mindestens 2 Zeichen.");
  const url = new URL("https://archive.org/advancedsearch.php");
  url.searchParams.set(
    "q",
    `collection:netlabels AND mediatype:audio AND format:MP3 AND (title:"${phrase}" OR creator:"${phrase}")`,
  );
  url.searchParams.append("fl[]", "identifier");
  url.searchParams.append("fl[]", "title");
  url.searchParams.append("fl[]", "creator");
  url.searchParams.set("rows", "4");
  url.searchParams.set("output", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) fail("Das Archiv ist gerade nicht erreichbar.");
  const body = (await res.json()) as {
    response?: { docs?: { identifier?: string; title?: string; creator?: string | string[] }[] };
  };
  const docs = (body.response?.docs ?? []).filter((doc) => /^[\w.-]{2,80}$/.test(doc.identifier ?? ""));
  const detailed = await Promise.all(
    docs.map(async (doc) => {
      const identifier = doc.identifier ?? "";
      try {
        const metaRes = await fetch(`https://archive.org/metadata/${identifier}`, { signal: AbortSignal.timeout(8000) });
        if (!metaRes.ok) return null;
        const meta = (await metaRes.json()) as {
          metadata?: { creator?: string | string[] };
          files?: { name?: string; length?: string; size?: string }[];
        };
        const file = (meta.files ?? []).find((item) => {
          const name = item.name ?? "";
          if (!name.toLowerCase().endsWith(".mp3") || name.includes("..")) return false;
          const length = Number(item.length);
          const size = Number(item.size);
          return length >= 45 && length <= 900 && size > 150_000 && size < 18_000_000;
        });
        if (!file?.name) return null;
        const creatorRaw = doc.creator ?? meta.metadata?.creator ?? "";
        const creator = clip(Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw, 140) || "Internet Archive";
        const path = file.name.split("/").map((part) => encodeURIComponent(part)).join("/");
        const audio = publicHttps(`https://archive.org/download/${encodeURIComponent(identifier)}/${path}`, 500);
        if (!audio) return null;
        const lengthMs = Math.round(Number(file.length) * 1000);
        return {
          title: clip(doc.title, 140) || "Ohne Titel",
          artist: creator,
          album: "Internet Archive",
          artworkUrl: publicHttps(`https://archive.org/services/img/${identifier}`),
          previewUrl: audio,
          source: "archive" as const,
          externalId: clip(`${identifier}/${file.name}`, 180),
          explicit: false,
          durationMs: Math.max(15_000, Math.min(15 * 60_000, lengthMs || 180_000)),
        } satisfies TrackInput;
      } catch {
        return null;
      }
    }),
  );
  return detailed.flatMap((item) => (item ? [item] : []));
}

async function youtubeOembed(id: string): Promise<{ title: string; author: string; thumb: string }> {
  const url = new URL("https://www.youtube.com/oembed");
  url.searchParams.set("url", `https://www.youtube.com/watch?v=${id}`);
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) fail("YouTube kennt diesen Link nicht.");
  const body = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
  const title = clip(body.title, 140);
  if (!title) fail("YouTube hat keinen Titel geliefert.");
  return { title, author: clip(body.author_name, 140) || "YouTube", thumb: httpsUrl(body.thumbnail_url) };
}

export const getStation = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      return sessionSnapshot(sql, context.userId);
    });
  });

export const searchMusic = createServerFn({ method: "POST" })
  .validator((input: { query?: string; catalog?: string }) => {
    const query = clip(input?.query, 80);
    if (query.length < 2) fail("Mindestens 2 Zeichen.");
    return { query, catalog: input?.catalog === "archive" ? ("archive" as const) : ("preview" as const) };
  })
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    if (data.catalog === "archive") return searchArchive(data.query);
    const sql = await getSql();
    const settings = await loadBaseSettings(sql);
    if (settings.musicSource === "spotify") {
      fail("Spotify ist noch nicht verbunden. Für die Testphase «Ganze Titel» wählen, das ist Internet Archive ohne Abo.");
    }
    return searchItunes(data.query);
  });

export const addWish = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseTrack(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const identity = await loadIdentity(sql, context.userId);
      const member = await ensureMember(sql, context.userId, identity.name);
      const effective = await loadEffective(sql);
      if (!effective.wishesEnabled) {
        const why = effective.activeRule ? ` (${effective.activeRule.title})` : "";
        fail(`Wünsche sind gerade geschlossen${why}.`);
      }
      if (isBlocked(data, effective.explicitFilter, parseWords(effective.extraBlocklist))) {
        fail("Dieser Titel ist für das aktuelle Programm gesperrt.");
      }
      if ((data.source === "youtube" || data.source === "link") && !isDesk(member.role)) {
        fail("Links und YouTube legt das Pult auf.");
      }
      const open = await sql<Row>`
        select count(*)::int as n from queue_items
        where added_by = ${context.userId} and status in ('queued', 'playing')
      `;
      if (asNum(open[0]?.n) >= MAX_OPEN_WISHES) {
        fail(`Höchstens ${MAX_OPEN_WISHES} offene Wünsche pro Person.`);
      }
      if (data.externalId) {
        const dup = await sql<Row>`
          select id from queue_items
          where external_id = ${data.externalId} and status in ('queued', 'playing')
          limit 1
        `;
        if (dup[0]) fail("Der Titel steht schon in der Sendung.");
      }
      await sql`
        insert into queue_items (
          title, artist, album, artwork_url, preview_url, source, external_id, explicit, duration_ms,
          added_by, added_by_name, status, score, upvotes, downvotes
        ) values (
          ${data.title}, ${data.artist}, ${data.album}, ${data.artworkUrl}, ${data.previewUrl},
          ${data.source}, ${data.externalId}, ${data.explicit}, ${data.durationMs},
          ${context.userId}, ${member.name}, 'queued', 0, 0, 0
        )
      `;
      await advancePlayback(sql);
      return buildSnapshot(sql, context.userId, member.name, identity.email, member.role);
    });
  });

export const castVote = createServerFn({ method: "POST" })
  .validator((input: { id?: number; value?: number }) => {
    const id = asNum(input?.id);
    const value = input?.value;
    if (!id) fail("Titel fehlt.");
    if (value !== 1 && value !== -1 && value !== 0) fail("Ungültige Stimme.");
    return { id, value: value as -1 | 0 | 1 };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const identity = await loadIdentity(sql, context.userId);
      const member = await ensureMember(sql, context.userId, identity.name);
      const rows = await sql<Row>`select * from queue_items where id = ${data.id}`;
      const item = rows[0];
      if (!item || asText(item.status) !== "queued") fail("Den Titel kann man gerade nicht bewerten.");
      if (asText(item.added_by) === context.userId && data.value !== 0) {
        fail("Eigene Wünsche bewertet das Team, nicht du selbst.");
      }
      const queueRows = await sql<Row>`select count(*)::int as n from queue_items where status = 'queued'`;
      const budget = voteBudget(asNum(queueRows[0]?.n));
      const used = await sql<Row>`
        select
          coalesce(sum(case when v.value = 1 then 1 else 0 end), 0)::int as up_used,
          coalesce(sum(case when v.value = -1 then 1 else 0 end), 0)::int as down_used
        from votes v
        join queue_items q on q.id = v.queue_item_id
        where v.user_id = ${context.userId} and q.status = 'queued' and q.id <> ${data.id}
      `;
      const upUsed = asNum(used[0]?.up_used);
      const downUsed = asNum(used[0]?.down_used);
      if (data.value === 1 && upUsed >= budget.up) {
        fail(`Upvote-Kontingent voll (${budget.up} bei ${asNum(queueRows[0]?.n)} Titeln).`);
      }
      if (data.value === -1 && downUsed >= budget.down) {
        fail(`Downvote-Kontingent voll (${budget.down} bei ${asNum(queueRows[0]?.n)} Titeln).`);
      }
      if (data.value === 0) {
        await sql`delete from votes where queue_item_id = ${data.id} and user_id = ${context.userId}`;
      } else {
        await sql`
          insert into votes (queue_item_id, user_id, value)
          values (${data.id}, ${context.userId}, ${data.value})
          on conflict (queue_item_id, user_id) do update set value = excluded.value
        `;
      }
      const effective = await loadEffective(sql);
      await refreshScores(sql, data.id, effective.downvoteKick);
      await advancePlayback(sql);
      return buildSnapshot(sql, context.userId, member.name, identity.email, member.role);
    });
  });

export const withdrawWish = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Titel fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const identity = await loadIdentity(sql, context.userId);
      const member = await ensureMember(sql, context.userId, identity.name);
      const rows = await sql<Row>`select added_by, status from queue_items where id = ${data.id}`;
      const row = rows[0];
      if (!row || asText(row.status) !== "queued") fail("Der Titel ist nicht mehr in der Queue.");
      if (asText(row.added_by) !== context.userId && member.role !== "admin") {
        fail("Nur eigene Wünsche lassen sich zurückziehen.");
      }
      await sql`delete from queue_items where id = ${data.id}`;
      await advancePlayback(sql);
      return buildSnapshot(sql, context.userId, member.name, identity.email, member.role);
    });
  });

export const skipTrack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const admin = await requireAdmin(sql, context.userId);
      await advancePlayback(sql, { force: true });
      return buildSnapshot(sql, context.userId, admin.name, admin.email, "admin");
    });
  });

export const postAnnouncement = createServerFn({ method: "POST" })
  .validator((input: { title?: string; body?: string }) => {
    const title = clip(input?.title, 80);
    const body = clip(input?.body, 500);
    if (title.length < 2) fail("Die Durchsage braucht einen Titel.");
    if (body.length < 8) fail("Der Text ist zu kurz.");
    return { title, body };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const admin = await requireAdmin(sql, context.userId);
      await sql`
        insert into announcements (kind, title, body, status, air_at, created_by, created_by_name)
        values ('manual', ${data.title}, ${data.body}, 'queued', null, ${context.userId}, ${admin.name})
      `;
      await advancePlayback(sql, { interrupt: true });
      return buildSnapshot(sql, context.userId, admin.name, admin.email, "admin");
    });
  });

export const getAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await bootstrapPlaylist(sql, context.userId);
      await bootstrapStations(sql, context.userId);
      return loadAdmin(sql, context.userId);
    });
  });

export const saveSettings = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseSettings(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await sql`
        update station_settings set
          wishes_enabled = ${data.wishesEnabled},
          explicit_filter = ${data.explicitFilter},
          volume = ${data.volume},
          output_target = ${data.outputTarget},
          sonos_room = ${data.sonosRoom},
          sonos_host = ${data.sonosHost},
          receiver_url = ${data.receiverUrl},
          downvote_kick = ${data.downvoteKick},
          wish_prune = ${data.wishPrune},
          wish_prune_at = ${data.wishPruneAt},
          extra_blocklist = ${data.extraBlocklist},
          music_source = ${data.musicSource},
          spotify_client_id = ${data.spotifyClientId},
          moderator_enabled = ${data.moderatorEnabled},
          moderator_slots = ${data.moderatorSlots},
          moderator_topics = ${data.moderatorTopics || "firma,tech"},
          company_notes = ${data.companyNotes},
          monitor_external = ${data.monitorExternal}
        where id = 1
      `;
      if (data.outputTarget !== "browser" && data.receiverUrl) {
        try {
          await fetch(new URL("/v1/volume", data.receiverUrl), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              volume: data.volume,
              room: data.sonosRoom,
              output: data.outputTarget,
              sonosHost: data.sonosHost,
            }),
            signal: AbortSignal.timeout(2000),
          });
        } catch {
          // Speichern gilt auch ohne erreichbare Box.
        }
      }
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const saveRule = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseRule(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      if (data.id) {
        const updated = await sql`
          update calendar_rules set
            title = ${data.title},
            starts_at = ${data.startsAt},
            ends_at = ${data.endsAt},
            volume = ${data.volume},
            wishes_enabled = ${data.wishesEnabled},
            explicit_filter = ${data.explicitFilter},
            note = ${data.note}
          where id = ${data.id}
          returning id
        `;
        if (!updated[0]) fail("Regel nicht gefunden.");
      } else {
        await sql`
          insert into calendar_rules (
            title, starts_at, ends_at, volume, wishes_enabled, explicit_filter, note, created_by
          ) values (
            ${data.title}, ${data.startsAt}, ${data.endsAt}, ${data.volume},
            ${data.wishesEnabled}, ${data.explicitFilter}, ${data.note}, ${context.userId}
          )
        `;
      }
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const deleteRule = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Regel fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await sql`delete from calendar_rules where id = ${data.id}`;
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const createPlaylist = createServerFn({ method: "POST" })
  .validator((input: { name?: string }) => {
    const name = clip(input?.name, 60);
    if (name.length < 2) fail("Name zu kurz.");
    return { name };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      const count = await sql<Row>`select count(*)::int as n from playlists`;
      await sql`
        insert into playlists (name, is_fallback, created_by)
        values (${data.name}, ${asNum(count[0]?.n) === 0}, ${context.userId})
      `;
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const setFallback = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Playlist fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await sql`update playlists set is_fallback = false`;
      const updated = await sql`update playlists set is_fallback = true where id = ${data.id} returning id`;
      if (!updated[0]) fail("Playlist nicht gefunden.");
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const deletePlaylist = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Playlist fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await sql`delete from playlists where id = ${data.id}`;
      const left = await sql<Row>`select id from playlists order by id asc limit 1`;
      if (left[0]) {
        const anyFallback = await sql<Row>`select id from playlists where is_fallback = true limit 1`;
        if (!anyFallback[0]) {
          await sql`update playlists set is_fallback = true where id = ${asNum(left[0].id)}`;
        }
      }
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const addPlaylistTrack = createServerFn({ method: "POST" })
  .validator((input: { playlistId?: number; track?: unknown }) => {
    const playlistId = asNum(input?.playlistId);
    if (!playlistId) fail("Playlist fehlt.");
    return { playlistId, track: parseTrack(input?.track) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      const found = await sql<Row>`select id from playlists where id = ${data.playlistId}`;
      if (!found[0]) fail("Playlist nicht gefunden.");
      const pos = await sql<Row>`
        select coalesce(max(position), 0)::int as n from playlist_tracks where playlist_id = ${data.playlistId}
      `;
      const track = data.track;
      await sql`
        insert into playlist_tracks (
          playlist_id, title, artist, album, artwork_url, preview_url, source, external_id, explicit, position, duration_ms
        ) values (
          ${data.playlistId}, ${track.title}, ${track.artist}, ${track.album}, ${track.artworkUrl},
          ${track.previewUrl}, ${track.source}, ${track.externalId}, ${track.explicit}, ${asNum(pos[0]?.n) + 1},
          ${track.durationMs}
        )
      `;
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const removePlaylistTrack = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Titel fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await sql`delete from playlist_tracks where id = ${data.id}`;
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const generateModeration = createServerFn({ method: "POST" })
  .validator((input: { immediate?: boolean }) => ({ immediate: input?.immediate === true }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const settings = await loadBaseSettings(sql);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "KI ist hier noch nicht verfügbar. Durchsagen gehen trotzdem von Hand." };
    }
    const topics = (settings.moderatorTopics || "firma,tech")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "Du schreibst kurze deutsche Radiomoderationen für ein Mitarbeiter-Radio. Keine Emojis, keine erfundenen Schlagzeilen, keine erfundenen Firmenfakten. 3 bis 5 gesprochene Sätze.",
          },
          {
            role: "user",
            content: `Themen: ${topics.join(", ") || "firma"}. Firmennotizen, nur wenn sie etwas hergeben, nichts dazuerfinden: ${settings.companyNotes || "keine"}. Wenn lokal dabei ist: ein allgemeiner Satz zum Bürotag, ohne Ortsbehauptungen. Wenn tech dabei ist: ein zeitloser Hinweis aus dem Arbeitsalltag (Backups, Updates, Fokus), keine aktuellen Produktnews.`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: "Die Moderation konnte gerade nicht erzeugt werden." };
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = clip(body.choices?.[0]?.message?.content, 500);
    if (text.length < 8) return { ok: false as const, error: "Die Antwort war leer." };
    const slot = data.immediate ? null : nextSlot(settings.moderatorSlots);
    if (!data.immediate && !slot) {
      return { ok: false as const, error: "Kein Moderations-Slot gesetzt." };
    }
    await withRadioLock(async () => {
      await sql`
        insert into announcements (kind, title, body, status, air_at, created_by, created_by_name)
        values (
          'moderator', 'Moderation', ${text}, 'queued', ${slot ? slot.toISOString() : null},
          ${context.userId}, 'Moderation'
        )
      `;
      if (data.immediate) await advancePlayback(sql, { interrupt: true });
    });
    return { ok: true as const, text, airAt: slot ? slot.toISOString() : null };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .validator((input: { userId?: string; role?: string }) => {
    const userId = clip(input?.userId, 80);
    if (!userId) fail("Person fehlt.");
    if (input?.role !== "admin" && input?.role !== "dj" && input?.role !== "listener") fail("Rolle ungültig.");
    return { userId, role: input.role };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      if (data.userId === context.userId && data.role !== "admin") {
        const admins = await sql<Row>`select count(*)::int as n from members where role = 'admin'`;
        if (asNum(admins[0]?.n) <= 1) fail("Die letzte Regie kann sich nicht selbst entheben.");
      }
      const updated = await sql`
        update members set role = ${data.role} where user_id = ${data.userId} returning user_id
      `;
      if (!updated[0]) fail("Person nicht gefunden.");
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const pruneWishes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      const removed = await pruneWeakWishes(sql, { manual: true });
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, removed };
    });
  });

export const checkOutput = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OutputProbe> => {
    const sql = await getSql();
    await requireAdmin(sql, context.userId);
    const settings = await loadBaseSettings(sql);
    if (settings.outputTarget === "browser") {
      return {
        ok: true,
        usingSaved: true,
        detail: "Ton bleibt in diesem Browser.",
        lines: [{ label: "Ausgabe", ok: true, detail: "Dieser Browser" }],
      };
    }
    const saved = settings.receiverUrl;
    const target = saved || (await suggestedReceiver());
    if (!target) {
      return {
        ok: false,
        usingSaved: false,
        detail: "Keine Receiver-Adresse.",
        lines: [{ label: "Receiver", ok: false, detail: "Adresse fehlt" }],
      };
    }
    const probe = await callReceiver(target, "/v1/probe", {
      mode: "track",
      url: "https://example.com/pulse-probe.mp3",
      title: "Verbindungstest",
      artist: "ACP Pulse",
      text: "",
      volume: settings.volume,
      room: settings.sonosRoom,
      output: settings.outputTarget,
      sonosHost: settings.sonosHost,
    });
    if (!probe) {
      const health = await callReceiver(target, "/v1/health", null);
      return {
        ok: false,
        usingSaved: Boolean(saved),
        detail: health ? "Receiver da, Prüfung unvollständig." : "Receiver nicht erreichbar.",
        lines: [{ label: "Receiver", ok: Boolean(health), detail: health ? "Nur Gesundheit geprüft" : "Keine Antwort" }],
      };
    }
    const lines = Array.isArray(probe.lines) ? probe.lines.filter(isProbeLine) : [];
    const ok = probe.ok === true && lines.every((item) => item.ok);
    const prefix = saved ? "" : "Noch nicht gespeichert. ";
    return {
      ok,
      usingSaved: Boolean(saved),
      detail: `${prefix}${typeof probe.detail === "string" ? probe.detail : ok ? "Prüfung in Ordnung." : "Prüfung fehlgeschlagen."}`,
      lines,
    };
  });

function isProbeLine(value: unknown): value is ProbeLine {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.label === "string" && typeof row.ok === "boolean" && typeof row.detail === "string";
}

async function callReceiver(origin: string, path: string, body: Record<string, unknown> | null): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(new URL(path, origin), {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok && path === "/v1/health") return null;
    const json = (await res.json()) as unknown;
    if (!json || typeof json !== "object") return null;
    return json as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function deskView(sql: Sql, userId: string, name: string, role: DeskRole): Promise<DeskSnapshot> {
  await bootstrapStations(sql, userId);
  return {
    me: { id: userId, name, role },
    recordings: await loadRecordings(sql),
    stations: await loadStations(sql),
    slots: await loadSlots(sql),
  };
}

function clipMime(value: unknown): string {
  const mime = clip(value, 80).split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "audio/webm" || mime === "audio/mp4" || mime === "audio/ogg" || mime === "audio/wav" || mime === "audio/mpeg") {
    return mime;
  }
  fail("Dieses Audioformat geht nicht.");
}

function clipAudio(value: unknown): string {
  const raw = asText(value).replace(/\s/g, "");
  if (raw.length < 32 || raw.length > 1_500_000) fail("Die Aufnahme ist zu lang oder leer.");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) fail("Aufnahme unvollständig.");
  return raw;
}

async function queueTrack(sql: Sql, userId: string, name: string, track: TrackInput) {
  await sql`
    insert into queue_items (
      title, artist, album, artwork_url, preview_url, source, external_id, explicit, duration_ms,
      added_by, added_by_name, status, score, upvotes, downvotes
    ) values (
      ${track.title}, ${track.artist}, ${track.album}, ${track.artworkUrl}, ${track.previewUrl},
      ${track.source}, ${track.externalId}, ${track.explicit}, ${track.durationMs},
      ${userId}, ${name}, 'queued', 0, 0, 0
    )
  `;
}

async function airRecording(sql: Sql, userId: string, name: string, recordingId: number, title: string) {
  await sql`
    insert into announcements (kind, title, body, status, air_at, created_by, created_by_name, recording_id)
    values ('mic', ${title}, ${title}, 'queued', null, ${userId}, ${name}, ${recordingId})
  `;
  await advancePlayback(sql, { interrupt: true });
}

export const getDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const desk = await requireDesk(sql, context.userId);
    return deskView(sql, context.userId, desk.name, desk.role);
  });

export const saveRecording = createServerFn({ method: "POST" })
  .validator((input: { title?: string; mime?: string; audioBase64?: string; durationMs?: number; air?: boolean }) => {
    const title = clip(input?.title, 80);
    if (title.length < 2) fail("Die Aufnahme braucht einen Namen.");
    const durationMs = Math.round(asNum(input?.durationMs));
    if (durationMs < 800 || durationMs > 45_000) fail("Aufnahmen sind 1 bis 45 Sekunden lang.");
    return {
      title,
      mime: clipMime(input?.mime),
      audioBase64: clipAudio(input?.audioBase64),
      durationMs,
      air: input?.air === true,
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const desk = await requireDesk(sql, context.userId);
      const count = await sql<Row>`select count(*)::int as n from recordings`;
      if (asNum(count[0]?.n) >= 40) fail("Höchstens 40 Aufnahmen. Ältere im Pult löschen.");
      const inserted = await sql<Row>`
        insert into recordings (title, mime, audio_base64, duration_ms, created_by, created_by_name)
        values (${data.title}, ${data.mime}, ${data.audioBase64}, ${data.durationMs}, ${context.userId}, ${desk.name})
        returning id
      `;
      const id = asNum(inserted[0]?.id);
      if (!id) fail("Aufnahme nicht gespeichert.");
      if (data.air) await airRecording(sql, context.userId, desk.name, id, data.title);
      return deskView(sql, context.userId, desk.name, desk.role);
    });
  });

export const playRecording = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Aufnahme fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const desk = await requireDesk(sql, context.userId);
      const rows = await sql<Row>`select id, title from recordings where id = ${data.id}`;
      const row = rows[0];
      if (!row) fail("Aufnahme nicht gefunden.");
      await airRecording(sql, context.userId, desk.name, data.id, clip(row.title, 80) || "Durchsage");
      return deskView(sql, context.userId, desk.name, desk.role);
    });
  });

export const deleteRecording = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Aufnahme fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const desk = await requireDesk(sql, context.userId);
      await sql`delete from recordings where id = ${data.id}`;
      return deskView(sql, context.userId, desk.name, desk.role);
    });
  });

export const getClip = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Aufnahme fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const identity = await loadIdentity(sql, context.userId);
    const member = await ensureMember(sql, context.userId, identity.name);
    if (!isDesk(member.role)) {
      const live = await sql<Row>`
        select id from announcements
        where recording_id = ${data.id} and status in ('live', 'queued')
        limit 1
      `;
      if (!live[0]) fail("Diese Aufnahme ist nicht auf Sendung.");
    }
    const rows = await sql<Row>`select mime, audio_base64 from recordings where id = ${data.id}`;
    const row = rows[0];
    if (!row) fail("Aufnahme nicht gefunden.");
    return { mime: asText(row.mime), audioBase64: asText(row.audio_base64) };
  });

export const addExternal = createServerFn({ method: "POST" })
  .validator((input: { url?: string }) => {
    const url = clip(input?.url, 400);
    if (url.length < 8) fail("Link fehlt.");
    return { url };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const desk = await requireDesk(sql, context.userId);
      const video = youtubeId(data.url);
      let track: TrackInput;
      if (video) {
        const info = await youtubeOembed(video);
        track = {
          title: info.title,
          artist: info.author,
          album: "YouTube",
          artworkUrl: info.thumb,
          previewUrl: "",
          source: "youtube",
          externalId: video,
          explicit: false,
          durationMs: 180_000,
        };
      } else {
        const audio = publicHttps(data.url, 500);
        if (!audio) fail("Nur öffentliche https-Links.");
        const path = new URL(audio).pathname.toLowerCase();
        if (!/\.(mp3|m4a|aac|ogg|wav)$/.test(path)) {
          fail("YouTube-Link oder direkte Audiodatei (mp3, m4a, aac, ogg, wav).");
        }
        const file = decodeURIComponent(path.split("/").pop() ?? "Audio").replace(/\.[a-z0-9]+$/i, "");
        track = {
          title: clip(file, 140) || "Audio",
          artist: "Link",
          album: "",
          artworkUrl: "",
          previewUrl: audio,
          source: "link",
          externalId: "",
          explicit: false,
          durationMs: 180_000,
        };
      }
      const effective = await loadEffective(sql);
      if (isBlocked(track, effective.explicitFilter, parseWords(effective.extraBlocklist))) {
        fail("Dieser Titel ist für das aktuelle Programm gesperrt.");
      }
      await queueTrack(sql, context.userId, desk.name, track);
      await advancePlayback(sql);
      return { title: track.title };
    });
  });

export const saveStation = createServerFn({ method: "POST" })
  .validator((input: { name?: string; streamUrl?: string; note?: string }) => {
    const name = clip(input?.name, 80);
    const stream = publicHttps(clip(input?.streamUrl, 300));
    if (name.length < 2) fail("Der Sender braucht einen Namen.");
    if (!stream) fail("Nur öffentliche https-Streams.");
    return { name, streamUrl: stream, note: clip(input?.note, 160) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await sql`
        insert into relay_stations (name, stream_url, note, created_by)
        values (${data.name}, ${data.streamUrl}, ${data.note}, ${context.userId})
      `;
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const deleteStation = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Sender fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await sql`delete from relay_stations where id = ${data.id}`;
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const saveRelaySlot = createServerFn({ method: "POST" })
  .validator((input: { stationId?: number; title?: string; startsAt?: string; endsAt?: string }) => {
    const stationId = asNum(input?.stationId);
    const title = clip(input?.title, 80);
    const startsAt = asIso(input?.startsAt);
    const endsAt = asIso(input?.endsAt);
    if (!stationId) fail("Sender fehlt.");
    if (title.length < 2) fail("Das Fenster braucht einen Namen.");
    if (!startsAt || !endsAt) fail("Beginn und Ende fehlen.");
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) fail("Das Ende liegt vor dem Beginn.");
    return { stationId, title, startsAt, endsAt };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      const found = await sql<Row>`select id from relay_stations where id = ${data.stationId}`;
      if (!found[0]) fail("Sender nicht gefunden.");
      await sql`
        insert into relay_slots (station_id, title, starts_at, ends_at, created_by)
        values (${data.stationId}, ${data.title}, ${data.startsAt}, ${data.endsAt}, ${context.userId})
      `;
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const deleteRelaySlot = createServerFn({ method: "POST" })
  .validator((input: { id?: number }) => {
    const id = asNum(input?.id);
    if (!id) fail("Fenster fehlt.");
    return { id };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      await requireAdmin(sql, context.userId);
      await sql`delete from relay_slots where id = ${data.id}`;
      const base = await loadBaseSettings(sql);
      const admin = await loadAdmin(sql, context.userId);
      return { ...admin, settings: base };
    });
  });

export const startRelayNow = createServerFn({ method: "POST" })
  .validator((input: { stationId?: number; minutes?: number }) => {
    const stationId = asNum(input?.stationId);
    const minutes = Math.round(asNum(input?.minutes));
    if (!stationId) fail("Sender fehlt.");
    if (minutes !== 10 && minutes !== 30 && minutes !== 60) fail("10, 30 oder 60 Minuten.");
    return { stationId, minutes };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    return withRadioLock(async () => {
      const sql = await getSql();
      const desk = await requireDesk(sql, context.userId);
      const found = await sql<Row>`select name from relay_stations where id = ${data.stationId}`;
      if (!found[0]) fail("Sender nicht gefunden.");
      const ends = new Date(Date.now() + data.minutes * 60_000).toISOString();
      await sql`
        insert into relay_slots (station_id, title, starts_at, ends_at, created_by)
        values (${data.stationId}, ${`Jetzt · ${asText(found[0].name)}`}, now(), ${ends}, ${context.userId})
      `;
      await advancePlayback(sql);
      return deskView(sql, context.userId, desk.name, desk.role);
    });
  });

