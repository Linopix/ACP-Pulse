import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { r as getSql } from "./db-Bh7JWXtb.mjs";
import { a as isDesk, c as parseWords, d as youtubeId, i as isBlocked, l as speechDurationMs, n as clampKick, o as nextSlot, r as clampVolume, s as outputLabel, t as authMiddleware, u as voteBudget } from "./logic-Boooy6fK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-C54I5GMt.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var SEEDS = [
	"Norah Jones Don't Know Why",
	"Khruangbin Friday Morning",
	"Fleetwood Mac Dreams",
	"Men I Trust Show Me How",
	"Tycho A Walk",
	"Corinne Bailey Rae Put Your Records On"
];
var radioLock = Promise.resolve();
var lastDispatchAttempt = 0;
function withRadioLock(fn) {
	const prev = radioLock;
	let release = () => {};
	radioLock = new Promise((resolve) => {
		release = resolve;
	});
	return prev.then(fn, fn).finally(release);
}
function fail(message) {
	throw new Error(message);
}
function asNum(value, fallback = 0) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : fallback;
}
function asBool(value) {
	return value === true || value === "t" || value === "true" || value === 1;
}
function asIso(value) {
	if (value == null || value === "") return null;
	if (value instanceof Date) return value.toISOString();
	const d = new Date(String(value));
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString();
}
function asText(value) {
	return typeof value === "string" ? value : value == null ? "" : String(value);
}
function clip(value, max) {
	return asText(value).trim().slice(0, max);
}
function httpsUrl(value) {
	const raw = clip(value, 500);
	if (!raw.startsWith("https://")) return "";
	try {
		const url = new URL(raw);
		return url.protocol === "https:" ? url.toString() : "";
	} catch {
		return "";
	}
}
function asFilter(value) {
	if (value === "allow" || value === "clean" || value === "strict") return value;
	return "clean";
}
function asFilterOrNull(value) {
	if (value == null || value === "") return null;
	if (value === "allow" || value === "clean" || value === "strict") return value;
	return null;
}
function asOutput(value) {
	if (value === "sonos" || value === "receiver" || value === "browser") return value;
	return "browser";
}
function asSource(value) {
	if (value === "spotify" || value === "archive" || value === "youtube" || value === "link") return value;
	return "preview";
}
function asRole(value) {
	if (value === "admin" || value === "dj") return value;
	return "listener";
}
function blockedHost(hostname) {
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
function publicHttps(value, max = 300) {
	const raw = clip(value, max);
	let url;
	try {
		url = new URL(raw);
	} catch {
		return "";
	}
	if (url.protocol !== "https:" || url.username || url.password) return "";
	if (blockedHost(url.hostname)) return "";
	return url.toString();
}
function asVote(value) {
	const n = asNum(value, 0);
	if (n > 0) return 1;
	if (n < 0) return -1;
	return 0;
}
function httpOrigin(value) {
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
function hostOnly(value) {
	const host = (value.trim().replace(/^https?:\/\//, "").split("/")[0] ?? "").slice(0, 120);
	if (!host || !/^[a-zA-Z0-9.\-:]+$/.test(host)) return "";
	if (host === "169.254.169.254") return "";
	return host;
}
function trackFrom(row) {
	return {
		title: asText(row.title),
		artist: asText(row.artist),
		album: asText(row.album),
		artworkUrl: httpsUrl(row.artwork_url),
		previewUrl: httpsUrl(row.preview_url),
		source: asSource(row.source),
		externalId: asText(row.external_id),
		explicit: asBool(row.explicit),
		durationMs: Math.max(0, asNum(row.duration_ms))
	};
}
function parseTrack(input) {
	if (!input || typeof input !== "object") fail("Ungültiger Titel.");
	const o = input;
	const title = clip(o.title, 140);
	const artist = clip(o.artist, 140);
	if (title.length < 1 || artist.length < 1) fail("Titel und Interpret fehlen.");
	const source = asSource(o.source);
	const durationMs = Math.max(0, Math.min(9e5, Math.round(asNum(o.durationMs))));
	return {
		title,
		artist,
		album: clip(o.album, 160),
		artworkUrl: httpsUrl(o.artworkUrl),
		previewUrl: source === "youtube" ? "" : httpsUrl(o.previewUrl),
		source,
		externalId: clip(o.externalId, 180),
		explicit: o.explicit === true,
		durationMs
	};
}
function playDuration(row, preview) {
	const stored = asNum(row.duration_ms);
	if (stored > 0) return stored;
	if (row.source === "youtube") return 18e4;
	if (row.source === "archive" || row.source === "link") return preview ? 18e4 : 12e3;
	return preview ? 3e4 : 12e3;
}
async function loadIdentity(sql, userId) {
	const rows = await sql`select "name", "email" from "user" where "id" = ${userId} limit 1`;
	const email = asText(rows[0]?.email);
	return {
		name: clip(rows[0]?.name, 80) || email.split("@")[0] || "Team",
		email
	};
}
async function ensureMember(sql, userId, name) {
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
	const row = (await sql`select user_id, display_name, role from members where user_id = ${userId}`)[0];
	if (!row) fail("Profil fehlt.");
	return {
		id: userId,
		name: asText(row.display_name) || name,
		role: asRole(row.role)
	};
}
async function requireAdmin(sql, userId) {
	const identity = await loadIdentity(sql, userId);
	const member = await ensureMember(sql, userId, identity.name);
	if (member.role !== "admin") fail("Nur die Regie darf das.");
	return {
		...member,
		email: identity.email
	};
}
async function requireDesk(sql, userId) {
	const identity = await loadIdentity(sql, userId);
	const member = await ensureMember(sql, userId, identity.name);
	if (!isDesk(member.role)) fail("Das Pult ist für DJs und die Regie.");
	return {
		...member,
		email: identity.email
	};
}
function mapSettings(row) {
	return {
		wishesEnabled: asBool(row.wishes_enabled),
		explicitFilter: asFilter(row.explicit_filter),
		volume: clampVolume(asNum(row.volume, 42)),
		outputTarget: asOutput(row.output_target),
		sonosRoom: asText(row.sonos_room),
		sonosHost: asText(row.sonos_host),
		receiverUrl: asText(row.receiver_url),
		downvoteKick: clampKick(asNum(row.downvote_kick, 3)),
		extraBlocklist: asText(row.extra_blocklist),
		musicSource: row.music_source === "spotify" ? "spotify" : row.music_source === "archive" ? "archive" : "preview",
		spotifyClientId: asText(row.spotify_client_id),
		moderatorEnabled: asBool(row.moderator_enabled),
		moderatorSlots: asText(row.moderator_slots) || "09:00,12:30,16:00",
		moderatorTopics: asText(row.moderator_topics) || "firma,tech",
		companyNotes: asText(row.company_notes),
		monitorExternal: asBool(row.monitor_external)
	};
}
async function loadEffective(sql) {
	const base = mapSettings((await sql`select * from station_settings where id = 1`)[0] ?? {});
	const rule = (await sql`
    select * from calendar_rules
    where starts_at <= now() and ends_at >= now()
    order by starts_at desc
    limit 1
  `)[0];
	if (!rule) return {
		...base,
		activeRule: null
	};
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
			endsAt: asIso(rule.ends_at) ?? (/* @__PURE__ */ new Date()).toISOString(),
			note: asText(rule.note)
		}
	};
}
async function searchItunes(query) {
	const url = new URL("https://itunes.apple.com/search");
	url.searchParams.set("term", query);
	url.searchParams.set("entity", "song");
	url.searchParams.set("media", "music");
	url.searchParams.set("limit", "8");
	const res = await fetch(url, { signal: AbortSignal.timeout(8e3) });
	if (!res.ok) fail("Die Musiksuche ist gerade nicht erreichbar.");
	return ((await res.json()).results ?? []).map((hit) => {
		const art = hit.artworkUrl100?.replace("100x100bb", "300x300bb") ?? "";
		return {
			title: clip(hit.trackName, 140),
			artist: clip(hit.artistName, 140),
			album: clip(hit.collectionName, 160),
			artworkUrl: httpsUrl(art),
			previewUrl: httpsUrl(hit.previewUrl),
			source: "preview",
			externalId: hit.trackId ? String(hit.trackId) : "",
			explicit: hit.trackExplicitness === "explicit",
			durationMs: hit.previewUrl ? 3e4 : 0
		};
	}).filter((hit) => hit.title && hit.artist);
}
var catalogAttemptAt = 0;
async function bootstrapPlaylist(sql, userId) {
	let playlistId = asNum((await sql`select id from playlists where is_fallback = true order by id asc limit 1`)[0]?.id);
	if (!playlistId) {
		playlistId = asNum((await sql`select id from playlists order by id asc limit 1`)[0]?.id);
		if (playlistId) await sql`update playlists set is_fallback = true where id = ${playlistId}`;
	}
	if (!playlistId) playlistId = asNum((await sql`
      insert into playlists (name, is_fallback, created_by)
      values ('Hausplaylist', true, ${userId})
      returning id
    `)[0]?.id);
	if (!playlistId) return;
	if (asNum((await sql`select count(*)::int as n from playlist_tracks where playlist_id = ${playlistId}`)[0]?.n) === 0 && Date.now() - catalogAttemptAt > 6e4) {
		catalogAttemptAt = Date.now();
		const batches = await Promise.all(SEEDS.map(async (term) => {
			try {
				return await searchItunes(term);
			} catch {
				return [];
			}
		}));
		let position = 0;
		for (const hits of batches) {
			const hit = hits.find((item) => item.previewUrl && !item.explicit) ?? hits.find((item) => item.previewUrl) ?? null;
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
async function seedOpeningQueue(sql, playlistId) {
	if (asNum((await sql`select count(*)::int as n from queue_items`)[0]?.n) > 0) return;
	const tracks = await sql`
    select * from playlist_tracks
    where playlist_id = ${playlistId} and preview_url <> '' and explicit = false
    order by position asc, id asc
    limit 5
  `;
	for (const row of tracks) await sql`
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
async function readPlayback(sql) {
	return (await sql`select * from playback where id = 1`)[0] ?? {};
}
function playbackDue(row) {
	const started = asIso(row.started_at);
	if (!started) return true;
	return Date.now() - new Date(started).getTime() >= asNum(row.duration_ms, 0) - 250;
}
async function waitingAnnouncement(sql) {
	return asNum((await sql`
    select count(*)::int as n from announcements
    where status = 'queued' and (air_at is null or air_at <= now())
  `)[0]?.n) > 0;
}
async function startAnnouncement(sql, row) {
	const id = asNum(row.id);
	const body = asText(row.body);
	let duration = speechDurationMs(body);
	const recordingId = row.recording_id == null ? null : asNum(row.recording_id);
	if (recordingId) {
		const ms = asNum((await sql`select duration_ms from recordings where id = ${recordingId}`)[0]?.duration_ms);
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
async function loadActiveRelay(sql) {
	const row = (await sql`
    select r.id, r.title, r.starts_at, r.ends_at, s.name, s.stream_url
    from relay_slots r
    join relay_stations s on s.id = r.station_id
    where r.starts_at <= now() and r.ends_at > now()
    order by r.starts_at desc
    limit 1
  `)[0];
	if (!row) return null;
	return {
		id: asNum(row.id),
		title: asText(row.title),
		name: asText(row.name),
		stream_url: asText(row.stream_url),
		starts_at: row.starts_at,
		ends_at: row.ends_at
	};
}
async function startRelay(sql, relay) {
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
      duration_ms = ${Math.max(5e3, endMs - startMs)},
      dispatch_key = ''
    where id = 1
  `;
}
async function advancePlayback(sql, opts) {
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
	const due = playbackDue(pb) || opts?.force === true || idle || mode === "relay" && !relay;
	const annCut = opts?.interrupt === true || waiting && mode !== "announcement";
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
	if (!due && (annCut || relayCut)) {
		if (mode === "track" && queueId) await sql`
        update queue_items set status = 'queued'
        where id = ${queueId} and status = 'playing'
      `;
		if (mode === "fallback") await sql`update playback set fallback_cursor = greatest(0, fallback_cursor - 1) where id = 1`;
		if (mode === "announcement" && annId && annCut) await sql`update announcements set status = 'done', played_at = now() where id = ${annId}`;
	} else {
		if (mode === "track" && queueId) await sql`
        update queue_items set status = 'played', played_at = now()
        where id = ${queueId} and status = 'playing'
      `;
		if (mode === "announcement" && annId) await sql`
        update announcements set status = 'done', played_at = now()
        where id = ${annId} and status = 'live'
      `;
	}
	pb = await readPlayback(sql);
	const effective = await loadEffective(sql);
	const extra = parseWords(effective.extraBlocklist);
	const anns = await sql`
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
	const next = (await sql`
    select * from queue_items
    where status = 'queued'
    order by score desc, created_at asc, id asc
  `).find((row) => !isBlocked(trackFrom(row), effective.explicitFilter, extra));
	if (next) {
		const id = asNum(next.id);
		await sql`
      update queue_items set status = 'played', played_at = now()
      where status = 'playing' and id <> ${id}
    `;
		await sql`update queue_items set status = 'playing' where id = ${id}`;
		await sql`
      update playback set
        mode = 'track',
        queue_item_id = ${id},
        playlist_track_id = null,
        announcement_id = null,
        relay_slot_id = null,
        started_at = now(),
        duration_ms = ${playDuration(next, httpsUrl(next.preview_url))},
        dispatch_key = ''
      where id = 1
    `;
		await tryDispatch(sql);
		return;
	}
	const playable = (await sql`
    select t.* from playlist_tracks t
    join playlists p on p.id = t.playlist_id
    where p.is_fallback = true
    order by t.position asc, t.id asc
  `).filter((row) => !isBlocked(trackFrom(row), effective.explicitFilter, extra));
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
	const track = playable[(cursor % playable.length + playable.length) % playable.length];
	await sql`
    update playback set
      mode = 'fallback',
      queue_item_id = null,
      playlist_track_id = ${asNum(track.id)},
      announcement_id = null,
      relay_slot_id = null,
      started_at = now(),
      duration_ms = ${playDuration(track, httpsUrl(track.preview_url))},
      fallback_cursor = ${cursor + 1},
      dispatch_key = ''
    where id = 1
  `;
	await tryDispatch(sql);
}
async function tryDispatch(sql) {
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
		asIso(pb.started_at) ?? ""
	].join(":");
	if (asText(pb.dispatch_key) === key) return;
	if (Date.now() - lastDispatchAttempt < 8e3) return;
	lastDispatchAttempt = Date.now();
	const now = await buildNow(sql, pb);
	try {
		if (!(await fetch(new URL("/v1/play", settings.receiverUrl), {
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
				output: settings.outputTarget
			}),
			signal: AbortSignal.timeout(2500)
		})).ok) return;
		await sql`update playback set dispatch_key = ${key} where id = 1`;
	} catch {}
}
async function buildNow(sql, pb) {
	const mode = asText(pb.mode);
	const startedAt = asIso(pb.started_at);
	const base = {
		startedAt,
		durationMs: asNum(pb.duration_ms, 3e4),
		announcementBody: "",
		explicit: false,
		live: false,
		youtubeId: "",
		recordingId: null
	};
	if (mode === "announcement" && pb.announcement_id != null) {
		const row = (await sql`select * from announcements where id = ${asNum(pb.announcement_id)}`)[0];
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
			recordingId
		};
	}
	if (mode === "relay" && pb.relay_slot_id != null) {
		const row = (await sql`
      select r.title, r.starts_at, s.name, s.stream_url
      from relay_slots r
      join relay_stations s on s.id = r.station_id
      where r.id = ${asNum(pb.relay_slot_id)}
    `)[0];
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
				live: true
			};
		}
	}
	if (mode === "track" && pb.queue_item_id != null) {
		const row = (await sql`select * from queue_items where id = ${asNum(pb.queue_item_id)}`)[0];
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
				youtubeId: youtube
			};
		}
	}
	if (mode === "fallback" && pb.playlist_track_id != null) {
		const row = (await sql`
      select t.*, p.name as playlist_name
      from playlist_tracks t
      join playlists p on p.id = t.playlist_id
      where t.id = ${asNum(pb.playlist_track_id)}
    `)[0];
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
				explicit: track.explicit
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
		via: "Programm"
	};
}
async function buildSnapshot(sql, userId, memberName, email, role) {
	const effective = await loadEffective(sql);
	const extra = parseWords(effective.extraBlocklist);
	const now = await buildNow(sql, await readPlayback(sql));
	const queue = (await sql`
    select q.*, coalesce(v.value, 0) as my_vote
    from queue_items q
    left join votes v on v.queue_item_id = q.id and v.user_id = ${userId}
    where q.status = 'queued'
    order by q.score desc, q.created_at asc, q.id asc
  `).map((row) => {
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
			createdAt: asIso(row.created_at) ?? (/* @__PURE__ */ new Date()).toISOString()
		};
	});
	const used = await sql`
    select
      coalesce(sum(case when v.value = 1 then 1 else 0 end), 0)::int as up_used,
      coalesce(sum(case when v.value = -1 then 1 else 0 end), 0)::int as down_used
    from votes v
    join queue_items q on q.id = v.queue_item_id
    where v.user_id = ${userId} and q.status = 'queued'
  `;
	const open = await sql`
    select count(*)::int as n from queue_items
    where added_by = ${userId} and status in ('queued', 'playing')
  `;
	const historyRows = await sql`
    select title, artist, played_at from queue_items
    where status = 'played' and played_at is not null
    order by played_at desc
    limit 5
  `;
	const lists = await sql`select name from playlists where is_fallback = true limit 1`;
	const budgetBase = voteBudget(queue.length);
	const relay = await loadActiveRelay(sql);
	return {
		me: {
			id: userId,
			name: memberName,
			email,
			role
		},
		wishesEnabled: effective.wishesEnabled,
		explicitFilter: effective.explicitFilter,
		volume: effective.volume,
		outputTarget: effective.outputTarget,
		outputLabel: outputLabel(effective.outputTarget, effective.sonosRoom),
		receiverConfigured: effective.receiverUrl.length > 0,
		musicSource: effective.musicSource,
		downvoteKick: effective.downvoteKick,
		monitorExternal: effective.monitorExternal,
		activeRule: effective.activeRule,
		relay: relay ? {
			title: relay.title || relay.name,
			stationName: relay.name,
			endsAt: asIso(relay.ends_at) ?? (/* @__PURE__ */ new Date()).toISOString()
		} : null,
		now,
		queue,
		history: historyRows.map((row) => ({
			title: asText(row.title),
			artist: asText(row.artist),
			at: asIso(row.played_at) ?? ""
		})),
		budget: {
			up: budgetBase.up,
			down: budgetBase.down,
			upUsed: asNum(used[0]?.up_used),
			downUsed: asNum(used[0]?.down_used),
			queueLength: queue.length
		},
		openWishes: asNum(open[0]?.n),
		fallbackName: asText(lists[0]?.name) || "Hausplaylist"
	};
}
async function sessionSnapshot(sql, userId) {
	const identity = await loadIdentity(sql, userId);
	const member = await ensureMember(sql, userId, identity.name);
	await bootstrapPlaylist(sql, userId);
	await bootstrapStations(sql, userId);
	await advancePlayback(sql);
	return buildSnapshot(sql, userId, member.name, identity.email, member.role);
}
async function refreshScores(sql, itemId, kickAt) {
	await sql`
    update queue_items q set
      upvotes = (select count(*)::int from votes v where v.queue_item_id = q.id and v.value = 1),
      downvotes = (select count(*)::int from votes v where v.queue_item_id = q.id and v.value = -1),
      score = (select coalesce(sum(v.value), 0)::int from votes v where v.queue_item_id = q.id)
    where q.id = ${itemId}
  `;
	const row = (await sql`select status, upvotes, downvotes from queue_items where id = ${itemId}`)[0];
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
function parseSettings(input) {
	if (!input || typeof input !== "object") fail("Einstellungen unvollständig.");
	const o = input;
	const slots = clip(o.moderatorSlots, 80);
	if (slots && !/^\d{2}:\d{2}(\s*,\s*\d{2}:\d{2})*$/.test(slots)) fail("Slots als Uhrzeiten, z. B. 09:00, 12:30, 16:00.");
	return {
		wishesEnabled: o.wishesEnabled === true,
		explicitFilter: asFilter(o.explicitFilter),
		volume: clampVolume(asNum(o.volume, 42)),
		outputTarget: asOutput(o.outputTarget),
		sonosRoom: clip(o.sonosRoom, 80),
		sonosHost: hostOnly(clip(o.sonosHost, 120)),
		receiverUrl: httpOrigin(clip(o.receiverUrl, 200)),
		downvoteKick: clampKick(asNum(o.downvoteKick, 3)),
		extraBlocklist: parseWords(clip(o.extraBlocklist, 400)).join(", "),
		musicSource: o.musicSource === "spotify" ? "spotify" : o.musicSource === "archive" ? "archive" : "preview",
		spotifyClientId: clip(o.spotifyClientId, 80).replace(/[^\w-]/g, ""),
		moderatorEnabled: o.moderatorEnabled === true,
		moderatorSlots: slots || "09:00,12:30,16:00",
		moderatorTopics: parseWords(clip(o.moderatorTopics, 80)).filter((topic) => topic === "lokal" || topic === "firma" || topic === "tech").join(","),
		companyNotes: clip(o.companyNotes, 2e3),
		monitorExternal: o.monitorExternal === true
	};
}
function parseRule(input) {
	if (!input || typeof input !== "object") fail("Regel unvollständig.");
	const o = input;
	const title = clip(o.title, 80);
	const startsAt = asIso(o.startsAt);
	const endsAt = asIso(o.endsAt);
	if (title.length < 2) fail("Die Regel braucht einen Namen.");
	if (!startsAt || !endsAt) fail("Beginn und Ende fehlen.");
	if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) fail("Das Ende liegt vor dem Beginn.");
	const volume = o.volume == null || o.volume === "" ? null : clampVolume(asNum(o.volume));
	return {
		id: o.id == null ? void 0 : asNum(o.id),
		title,
		startsAt,
		endsAt,
		volume,
		wishesEnabled: o.wishesEnabled == null ? null : o.wishesEnabled === true,
		explicitFilter: asFilterOrNull(o.explicitFilter),
		note: clip(o.note, 240)
	};
}
async function loadAdmin(sql, userId) {
	const settings = await loadBaseSettings(sql);
	const rules = await sql`select * from calendar_rules order by starts_at asc`;
	const now = Date.now();
	const playlists = await sql`select * from playlists order by is_fallback desc, name asc`;
	const tracks = await sql`select * from playlist_tracks order by position asc, id asc`;
	const members = await sql`
    select m.user_id, m.display_name, m.role, u.email
    from members m
    left join "user" u on u."id" = m.user_id
    order by m.created_at asc
  `;
	const anns = await sql`
    select * from announcements order by created_at desc limit 12
  `;
	const stations = await loadStations(sql);
	const slots = await loadSlots(sql);
	const byPlaylist = /* @__PURE__ */ new Map();
	for (const row of tracks) {
		const pid = asNum(row.playlist_id);
		const list = byPlaylist.get(pid) ?? [];
		list.push({
			...trackFrom(row),
			id: asNum(row.id),
			position: asNum(row.position)
		});
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
				active: startMs <= now && endMs >= now
			};
		}),
		playlists: playlists.map((row) => ({
			id: asNum(row.id),
			name: asText(row.name),
			isFallback: asBool(row.is_fallback),
			tracks: byPlaylist.get(asNum(row.id)) ?? []
		})),
		members: members.map((row) => ({
			userId: asText(row.user_id),
			displayName: asText(row.display_name),
			email: asText(row.email),
			role: asRole(row.role),
			mine: asText(row.user_id) === userId
		})),
		announcements: anns.map((row) => ({
			id: asNum(row.id),
			kind: asText(row.kind),
			title: asText(row.title),
			body: asText(row.body),
			status: asText(row.status),
			airAt: asIso(row.air_at),
			createdByName: asText(row.created_by_name),
			createdAt: asIso(row.created_at) ?? ""
		})),
		stations,
		slots,
		nextSlot: slot ? slot.toISOString() : null
	};
}
async function loadBaseSettings(sql) {
	return mapSettings((await sql`select * from station_settings where id = 1`)[0] ?? {});
}
var SEEDED_STATIONS = [
	[
		"Deutschlandfunk",
		"https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3",
		"Nachrichten und Aktuelles"
	],
	[
		"Deutschlandfunk Kultur",
		"https://st02.sslstream.dlf.de/dlf/02/128/mp3/stream.mp3",
		"Kultur"
	],
	[
		"Deutschlandfunk Nova",
		"https://st03.sslstream.dlf.de/dlf/03/128/mp3/stream.mp3",
		"Wissen"
	]
];
async function bootstrapStations(sql, userId) {
	if (asNum((await sql`select count(*)::int as n from relay_stations`)[0]?.n) > 0) return;
	for (const [name, streamUrl, note] of SEEDED_STATIONS) await sql`
      insert into relay_stations (name, stream_url, note, created_by)
      values (${name}, ${streamUrl}, ${note}, ${userId})
    `;
}
async function loadStations(sql) {
	return (await sql`select * from relay_stations order by name asc`).map((row) => ({
		id: asNum(row.id),
		name: asText(row.name),
		streamUrl: asText(row.stream_url),
		note: asText(row.note)
	}));
}
async function loadSlots(sql) {
	const rows = await sql`
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
			active: new Date(startsAt).getTime() <= now && new Date(endsAt).getTime() > now
		};
	});
}
async function loadRecordings(sql) {
	return (await sql`
    select id, title, mime, duration_ms, created_by_name, created_at
    from recordings
    order by created_at desc
    limit 30
  `).map((row) => ({
		id: asNum(row.id),
		title: asText(row.title),
		mime: asText(row.mime),
		durationMs: asNum(row.duration_ms),
		createdByName: asText(row.created_by_name),
		createdAt: asIso(row.created_at) ?? ""
	}));
}
async function searchArchive(query) {
	const phrase = query.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
	if (phrase.length < 2) fail("Mindestens 2 Zeichen.");
	const url = new URL("https://archive.org/advancedsearch.php");
	url.searchParams.set("q", `collection:netlabels AND mediatype:audio AND format:MP3 AND (title:"${phrase}" OR creator:"${phrase}")`);
	url.searchParams.append("fl[]", "identifier");
	url.searchParams.append("fl[]", "title");
	url.searchParams.append("fl[]", "creator");
	url.searchParams.set("rows", "4");
	url.searchParams.set("output", "json");
	const res = await fetch(url, { signal: AbortSignal.timeout(8e3) });
	if (!res.ok) fail("Das Archiv ist gerade nicht erreichbar.");
	const docs = ((await res.json()).response?.docs ?? []).filter((doc) => /^[\w.-]{2,80}$/.test(doc.identifier ?? ""));
	return (await Promise.all(docs.map(async (doc) => {
		const identifier = doc.identifier ?? "";
		try {
			const metaRes = await fetch(`https://archive.org/metadata/${identifier}`, { signal: AbortSignal.timeout(8e3) });
			if (!metaRes.ok) return null;
			const meta = await metaRes.json();
			const file = (meta.files ?? []).find((item) => {
				const name = item.name ?? "";
				if (!name.toLowerCase().endsWith(".mp3") || name.includes("..")) return false;
				const length = Number(item.length);
				const size = Number(item.size);
				return length >= 45 && length <= 900 && size > 15e4 && size < 18e6;
			});
			if (!file?.name) return null;
			const creatorRaw = doc.creator ?? meta.metadata?.creator ?? "";
			const creator = clip(Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw, 140) || "Internet Archive";
			const path = file.name.split("/").map((part) => encodeURIComponent(part)).join("/");
			const audio = publicHttps(`https://archive.org/download/${encodeURIComponent(identifier)}/${path}`, 500);
			if (!audio) return null;
			const lengthMs = Math.round(Number(file.length) * 1e3);
			return {
				title: clip(doc.title, 140) || "Ohne Titel",
				artist: creator,
				album: "Internet Archive",
				artworkUrl: publicHttps(`https://archive.org/services/img/${identifier}`),
				previewUrl: audio,
				source: "archive",
				externalId: clip(`${identifier}/${file.name}`, 180),
				explicit: false,
				durationMs: Math.max(15e3, Math.min(9e5, lengthMs || 18e4))
			};
		} catch {
			return null;
		}
	}))).flatMap((item) => item ? [item] : []);
}
async function youtubeOembed(id) {
	const url = new URL("https://www.youtube.com/oembed");
	url.searchParams.set("url", `https://www.youtube.com/watch?v=${id}`);
	url.searchParams.set("format", "json");
	const res = await fetch(url, { signal: AbortSignal.timeout(8e3) });
	if (!res.ok) fail("YouTube kennt diesen Link nicht.");
	const body = await res.json();
	const title = clip(body.title, 140);
	if (!title) fail("YouTube hat keinen Titel geliefert.");
	return {
		title,
		author: clip(body.author_name, 140) || "YouTube",
		thumb: httpsUrl(body.thumbnail_url)
	};
}
var getStation_createServerFn_handler = createServerRpc({
	id: "035c74680e1253d81b2fc5368729632b2a2ec96a03247448cf636dbc111a47b0",
	name: "getStation",
	filename: "src/lib/pulse/api.ts"
}, (opts) => getStation.__executeServer(opts));
var getStation = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getStation_createServerFn_handler, async ({ context }) => {
	return withRadioLock(async () => {
		return sessionSnapshot(await getSql(), context.userId);
	});
});
var searchMusic_createServerFn_handler = createServerRpc({
	id: "b2b9ba4a893f201b2acd722e580eb6ce8a39e9f86d87f8477287534bc83cdc60",
	name: "searchMusic",
	filename: "src/lib/pulse/api.ts"
}, (opts) => searchMusic.__executeServer(opts));
var searchMusic = createServerFn({ method: "POST" }).validator((input) => {
	const query = clip(input?.query, 80);
	if (query.length < 2) fail("Mindestens 2 Zeichen.");
	return {
		query,
		catalog: input?.catalog === "archive" ? "archive" : "preview"
	};
}).middleware([authMiddleware]).handler(searchMusic_createServerFn_handler, async ({ data }) => {
	if (data.catalog === "archive") return searchArchive(data.query);
	if ((await loadBaseSettings(await getSql())).musicSource === "spotify") fail("Spotify ist noch nicht verbunden. Für die Testphase «Ganze Titel» wählen, das ist Internet Archive ohne Abo.");
	return searchItunes(data.query);
});
var addWish_createServerFn_handler = createServerRpc({
	id: "4a5bb2f845b83fbf72fa32bab3e8a2b0d460d46ccda4e3ee8e0b0a04b13a109c",
	name: "addWish",
	filename: "src/lib/pulse/api.ts"
}, (opts) => addWish.__executeServer(opts));
var addWish = createServerFn({ method: "POST" }).validator((input) => parseTrack(input)).middleware([authMiddleware]).handler(addWish_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const identity = await loadIdentity(sql, context.userId);
		const member = await ensureMember(sql, context.userId, identity.name);
		const effective = await loadEffective(sql);
		if (!effective.wishesEnabled) fail(`Wünsche sind gerade geschlossen${effective.activeRule ? ` (${effective.activeRule.title})` : ""}.`);
		if (isBlocked(data, effective.explicitFilter, parseWords(effective.extraBlocklist))) fail("Dieser Titel ist für das aktuelle Programm gesperrt.");
		if ((data.source === "youtube" || data.source === "link") && !isDesk(member.role)) fail("Links und YouTube legt das Pult auf.");
		if (asNum((await sql`
        select count(*)::int as n from queue_items
        where added_by = ${context.userId} and status in ('queued', 'playing')
      `)[0]?.n) >= 3) fail(`Höchstens 3 offene Wünsche pro Person.`);
		if (data.externalId) {
			if ((await sql`
          select id from queue_items
          where external_id = ${data.externalId} and status in ('queued', 'playing')
          limit 1
        `)[0]) fail("Der Titel steht schon in der Sendung.");
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
var castVote_createServerFn_handler = createServerRpc({
	id: "23f0aced1753534d67e68736c35da0ec0be2620ae340168dfbe4601a2159d592",
	name: "castVote",
	filename: "src/lib/pulse/api.ts"
}, (opts) => castVote.__executeServer(opts));
var castVote = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	const value = input?.value;
	if (!id) fail("Titel fehlt.");
	if (value !== 1 && value !== -1 && value !== 0) fail("Ungültige Stimme.");
	return {
		id,
		value
	};
}).middleware([authMiddleware]).handler(castVote_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const identity = await loadIdentity(sql, context.userId);
		const member = await ensureMember(sql, context.userId, identity.name);
		const item = (await sql`select * from queue_items where id = ${data.id}`)[0];
		if (!item || asText(item.status) !== "queued") fail("Den Titel kann man gerade nicht bewerten.");
		if (asText(item.added_by) === context.userId && data.value !== 0) fail("Eigene Wünsche bewertet das Team, nicht du selbst.");
		const queueRows = await sql`select count(*)::int as n from queue_items where status = 'queued'`;
		const budget = voteBudget(asNum(queueRows[0]?.n));
		const used = await sql`
        select
          coalesce(sum(case when v.value = 1 then 1 else 0 end), 0)::int as up_used,
          coalesce(sum(case when v.value = -1 then 1 else 0 end), 0)::int as down_used
        from votes v
        join queue_items q on q.id = v.queue_item_id
        where v.user_id = ${context.userId} and q.status = 'queued' and q.id <> ${data.id}
      `;
		const upUsed = asNum(used[0]?.up_used);
		const downUsed = asNum(used[0]?.down_used);
		if (data.value === 1 && upUsed >= budget.up) fail(`Upvote-Kontingent voll (${budget.up} bei ${asNum(queueRows[0]?.n)} Titeln).`);
		if (data.value === -1 && downUsed >= budget.down) fail(`Downvote-Kontingent voll (${budget.down} bei ${asNum(queueRows[0]?.n)} Titeln).`);
		if (data.value === 0) await sql`delete from votes where queue_item_id = ${data.id} and user_id = ${context.userId}`;
		else await sql`
          insert into votes (queue_item_id, user_id, value)
          values (${data.id}, ${context.userId}, ${data.value})
          on conflict (queue_item_id, user_id) do update set value = excluded.value
        `;
		const effective = await loadEffective(sql);
		await refreshScores(sql, data.id, effective.downvoteKick);
		await advancePlayback(sql);
		return buildSnapshot(sql, context.userId, member.name, identity.email, member.role);
	});
});
var withdrawWish_createServerFn_handler = createServerRpc({
	id: "38588adeab36c1082924651a252eda05a4a93df6463437ad635f1d0acba977b5",
	name: "withdrawWish",
	filename: "src/lib/pulse/api.ts"
}, (opts) => withdrawWish.__executeServer(opts));
var withdrawWish = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Titel fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(withdrawWish_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const identity = await loadIdentity(sql, context.userId);
		const member = await ensureMember(sql, context.userId, identity.name);
		const row = (await sql`select added_by, status from queue_items where id = ${data.id}`)[0];
		if (!row || asText(row.status) !== "queued") fail("Der Titel ist nicht mehr in der Queue.");
		if (asText(row.added_by) !== context.userId && member.role !== "admin") fail("Nur eigene Wünsche lassen sich zurückziehen.");
		await sql`delete from queue_items where id = ${data.id}`;
		await advancePlayback(sql);
		return buildSnapshot(sql, context.userId, member.name, identity.email, member.role);
	});
});
var skipTrack_createServerFn_handler = createServerRpc({
	id: "96932f0d35f06231992c25b81b50a223cf310359929c455c9a85730d64bcdb99",
	name: "skipTrack",
	filename: "src/lib/pulse/api.ts"
}, (opts) => skipTrack.__executeServer(opts));
var skipTrack = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(skipTrack_createServerFn_handler, async ({ context }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const admin = await requireAdmin(sql, context.userId);
		await advancePlayback(sql, { force: true });
		return buildSnapshot(sql, context.userId, admin.name, admin.email, "admin");
	});
});
var postAnnouncement_createServerFn_handler = createServerRpc({
	id: "215ad7fe84849ab30cad564077cf246556e749256aac3a0edf4b8dab498abd87",
	name: "postAnnouncement",
	filename: "src/lib/pulse/api.ts"
}, (opts) => postAnnouncement.__executeServer(opts));
var postAnnouncement = createServerFn({ method: "POST" }).validator((input) => {
	const title = clip(input?.title, 80);
	const body = clip(input?.body, 500);
	if (title.length < 2) fail("Die Durchsage braucht einen Titel.");
	if (body.length < 8) fail("Der Text ist zu kurz.");
	return {
		title,
		body
	};
}).middleware([authMiddleware]).handler(postAnnouncement_createServerFn_handler, async ({ context, data }) => {
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
var getAdmin_createServerFn_handler = createServerRpc({
	id: "d609378bae3e753f4e519981a1015dbfa05c9c3ad3d4c21270f91d30d40cddcd",
	name: "getAdmin",
	filename: "src/lib/pulse/api.ts"
}, (opts) => getAdmin.__executeServer(opts));
var getAdmin = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getAdmin_createServerFn_handler, async ({ context }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		await bootstrapPlaylist(sql, context.userId);
		await bootstrapStations(sql, context.userId);
		return loadAdmin(sql, context.userId);
	});
});
var saveSettings_createServerFn_handler = createServerRpc({
	id: "ace1dcc032400705a48095e2ed5eb61dce926f8c6b658d6cf27ba24063e39998",
	name: "saveSettings",
	filename: "src/lib/pulse/api.ts"
}, (opts) => saveSettings.__executeServer(opts));
var saveSettings = createServerFn({ method: "POST" }).validator((input) => parseSettings(input)).middleware([authMiddleware]).handler(saveSettings_createServerFn_handler, async ({ context, data }) => {
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
		if (data.outputTarget !== "browser" && data.receiverUrl) try {
			await fetch(new URL("/v1/volume", data.receiverUrl), {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					volume: data.volume,
					room: data.sonosRoom,
					output: data.outputTarget
				}),
				signal: AbortSignal.timeout(2e3)
			});
		} catch {}
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var saveRule_createServerFn_handler = createServerRpc({
	id: "d7e04468e581688795bb63568bcce49f3caca7ff362e56c6579c132c707de628",
	name: "saveRule",
	filename: "src/lib/pulse/api.ts"
}, (opts) => saveRule.__executeServer(opts));
var saveRule = createServerFn({ method: "POST" }).validator((input) => parseRule(input)).middleware([authMiddleware]).handler(saveRule_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		if (data.id) {
			if (!(await sql`
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
        `)[0]) fail("Regel nicht gefunden.");
		} else await sql`
          insert into calendar_rules (
            title, starts_at, ends_at, volume, wishes_enabled, explicit_filter, note, created_by
          ) values (
            ${data.title}, ${data.startsAt}, ${data.endsAt}, ${data.volume},
            ${data.wishesEnabled}, ${data.explicitFilter}, ${data.note}, ${context.userId}
          )
        `;
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var deleteRule_createServerFn_handler = createServerRpc({
	id: "2f25a9beb898ef98539ce31234c2302803a25bfa7c1c8f8c273d6630aaab7525",
	name: "deleteRule",
	filename: "src/lib/pulse/api.ts"
}, (opts) => deleteRule.__executeServer(opts));
var deleteRule = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Regel fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(deleteRule_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		await sql`delete from calendar_rules where id = ${data.id}`;
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var createPlaylist_createServerFn_handler = createServerRpc({
	id: "6036e4e333c0c942cb521e3ac7ca6eac3eacb7d2a1e50db21d6c0332121eac53",
	name: "createPlaylist",
	filename: "src/lib/pulse/api.ts"
}, (opts) => createPlaylist.__executeServer(opts));
var createPlaylist = createServerFn({ method: "POST" }).validator((input) => {
	const name = clip(input?.name, 60);
	if (name.length < 2) fail("Name zu kurz.");
	return { name };
}).middleware([authMiddleware]).handler(createPlaylist_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		const count = await sql`select count(*)::int as n from playlists`;
		await sql`
        insert into playlists (name, is_fallback, created_by)
        values (${data.name}, ${asNum(count[0]?.n) === 0}, ${context.userId})
      `;
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var setFallback_createServerFn_handler = createServerRpc({
	id: "6775c241049911fda28002ce8cc17c218aa376d4d147ac1835e87f5c90ab7e35",
	name: "setFallback",
	filename: "src/lib/pulse/api.ts"
}, (opts) => setFallback.__executeServer(opts));
var setFallback = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Playlist fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(setFallback_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		await sql`update playlists set is_fallback = false`;
		if (!(await sql`update playlists set is_fallback = true where id = ${data.id} returning id`)[0]) fail("Playlist nicht gefunden.");
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var deletePlaylist_createServerFn_handler = createServerRpc({
	id: "e0f73301438a5bae62e4ecb42ba5779cf7636e61e3814b5fdf2de0b65617c11a",
	name: "deletePlaylist",
	filename: "src/lib/pulse/api.ts"
}, (opts) => deletePlaylist.__executeServer(opts));
var deletePlaylist = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Playlist fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(deletePlaylist_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		await sql`delete from playlists where id = ${data.id}`;
		const left = await sql`select id from playlists order by id asc limit 1`;
		if (left[0]) {
			if (!(await sql`select id from playlists where is_fallback = true limit 1`)[0]) await sql`update playlists set is_fallback = true where id = ${asNum(left[0].id)}`;
		}
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var addPlaylistTrack_createServerFn_handler = createServerRpc({
	id: "f82794ad5a4d1d5b1eabc96cc33092a74affb0c384efb0c4f1844819c9633042",
	name: "addPlaylistTrack",
	filename: "src/lib/pulse/api.ts"
}, (opts) => addPlaylistTrack.__executeServer(opts));
var addPlaylistTrack = createServerFn({ method: "POST" }).validator((input) => {
	const playlistId = asNum(input?.playlistId);
	if (!playlistId) fail("Playlist fehlt.");
	return {
		playlistId,
		track: parseTrack(input?.track)
	};
}).middleware([authMiddleware]).handler(addPlaylistTrack_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		if (!(await sql`select id from playlists where id = ${data.playlistId}`)[0]) fail("Playlist nicht gefunden.");
		const pos = await sql`
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
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var removePlaylistTrack_createServerFn_handler = createServerRpc({
	id: "05ee9a13580b3b15fceddb1b3858eead13bd5343a561c25264ec990dc2639a16",
	name: "removePlaylistTrack",
	filename: "src/lib/pulse/api.ts"
}, (opts) => removePlaylistTrack.__executeServer(opts));
var removePlaylistTrack = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Titel fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(removePlaylistTrack_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		await sql`delete from playlist_tracks where id = ${data.id}`;
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var generateModeration_createServerFn_handler = createServerRpc({
	id: "bb10633a2d6fc3b97a5d45794aa19d40beb0ba2f4c3184c9837163a56815b6c7",
	name: "generateModeration",
	filename: "src/lib/pulse/api.ts"
}, (opts) => generateModeration.__executeServer(opts));
var generateModeration = createServerFn({ method: "POST" }).validator((input) => ({ immediate: input?.immediate === true })).middleware([authMiddleware]).handler(generateModeration_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	await requireAdmin(sql, context.userId);
	const settings = await loadBaseSettings(sql);
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "KI ist hier noch nicht verfügbar. Durchsagen gehen trotzdem von Hand."
	};
	const topics = (settings.moderatorTopics || "firma,tech").split(",").map((part) => part.trim()).filter(Boolean);
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			max_tokens: 220,
			messages: [{
				role: "system",
				content: "Du schreibst kurze deutsche Radiomoderationen für ein Mitarbeiter-Radio. Keine Emojis, keine erfundenen Schlagzeilen, keine erfundenen Firmenfakten. 3 bis 5 gesprochene Sätze."
			}, {
				role: "user",
				content: `Themen: ${topics.join(", ") || "firma"}. Firmennotizen, nur wenn sie etwas hergeben, nichts dazuerfinden: ${settings.companyNotes || "keine"}. Wenn lokal dabei ist: ein allgemeiner Satz zum Bürotag, ohne Ortsbehauptungen. Wenn tech dabei ist: ein zeitloser Hinweis aus dem Arbeitsalltag (Backups, Updates, Fokus), keine aktuellen Produktnews.`
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: "Die Moderation konnte gerade nicht erzeugt werden."
	};
	const text = clip((await res.json()).choices?.[0]?.message?.content, 500);
	if (text.length < 8) return {
		ok: false,
		error: "Die Antwort war leer."
	};
	const slot = data.immediate ? null : nextSlot(settings.moderatorSlots);
	if (!data.immediate && !slot) return {
		ok: false,
		error: "Kein Moderations-Slot gesetzt."
	};
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
	return {
		ok: true,
		text,
		airAt: slot ? slot.toISOString() : null
	};
});
var setMemberRole_createServerFn_handler = createServerRpc({
	id: "e42b7b10548c26719e21483616bb1fb8c458e7b945a3e977c20f912cd95828a4",
	name: "setMemberRole",
	filename: "src/lib/pulse/api.ts"
}, (opts) => setMemberRole.__executeServer(opts));
var setMemberRole = createServerFn({ method: "POST" }).validator((input) => {
	const userId = clip(input?.userId, 80);
	if (!userId) fail("Person fehlt.");
	if (input?.role !== "admin" && input?.role !== "dj" && input?.role !== "listener") fail("Rolle ungültig.");
	return {
		userId,
		role: input.role
	};
}).middleware([authMiddleware]).handler(setMemberRole_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		if (data.userId === context.userId && data.role !== "admin") {
			if (asNum((await sql`select count(*)::int as n from members where role = 'admin'`)[0]?.n) <= 1) fail("Die letzte Regie kann sich nicht selbst entheben.");
		}
		if (!(await sql`
        update members set role = ${data.role} where user_id = ${data.userId} returning user_id
      `)[0]) fail("Person nicht gefunden.");
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var checkOutput_createServerFn_handler = createServerRpc({
	id: "e0bea75afadc455ed243035d2124d0ec7a5f4c31b2c1fb0a33b6b0bd67a82ef6",
	name: "checkOutput",
	filename: "src/lib/pulse/api.ts"
}, (opts) => checkOutput.__executeServer(opts));
var checkOutput = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(checkOutput_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	await requireAdmin(sql, context.userId);
	const settings = await loadBaseSettings(sql);
	if (settings.outputTarget === "browser") return {
		ok: true,
		detail: "Die Sendung läuft in diesem Browser. Sonos und Receiver bleiben unberührt."
	};
	if (!settings.receiverUrl) return {
		ok: false,
		detail: "Noch keine Receiver-Adresse. Ein kleiner Dienst im Büro-Netz nimmt später /v1/play, /v1/volume und /v1/health entgegen — für Sonos oder für Boxen am Server."
	};
	try {
		const res = await fetch(new URL("/v1/health", settings.receiverUrl), { signal: AbortSignal.timeout(2500) });
		if (!res.ok) return {
			ok: false,
			detail: `Receiver antwortet mit Status ${res.status}.`
		};
		return {
			ok: true,
			detail: "Receiver erreichbar. Die nächste Titeländerung geht dorthin."
		};
	} catch {
		return {
			ok: false,
			detail: "Receiver nicht erreichbar. Er muss aus diesem Netz sichtbar sein. Sonos selbst spricht nur lokal — die Bridge auf dem Mini-Server übersetzt."
		};
	}
});
async function deskView(sql, userId, name, role) {
	await bootstrapStations(sql, userId);
	return {
		me: {
			id: userId,
			name,
			role
		},
		recordings: await loadRecordings(sql),
		stations: await loadStations(sql),
		slots: await loadSlots(sql)
	};
}
function clipMime(value) {
	const mime = clip(value, 80).split(";")[0]?.trim().toLowerCase() ?? "";
	if (mime === "audio/webm" || mime === "audio/mp4" || mime === "audio/ogg" || mime === "audio/wav" || mime === "audio/mpeg") return mime;
	fail("Dieses Audioformat geht nicht.");
}
function clipAudio(value) {
	const raw = asText(value).replace(/\s/g, "");
	if (raw.length < 32 || raw.length > 15e5) fail("Die Aufnahme ist zu lang oder leer.");
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) fail("Aufnahme unvollständig.");
	return raw;
}
async function queueTrack(sql, userId, name, track) {
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
async function airRecording(sql, userId, name, recordingId, title) {
	await sql`
    insert into announcements (kind, title, body, status, air_at, created_by, created_by_name, recording_id)
    values ('mic', ${title}, ${title}, 'queued', null, ${userId}, ${name}, ${recordingId})
  `;
	await advancePlayback(sql, { interrupt: true });
}
var getDesk_createServerFn_handler = createServerRpc({
	id: "7591afc6bbd3e27658fa699667345d3230f33d7ee482171460846adab6d56097",
	name: "getDesk",
	filename: "src/lib/pulse/api.ts"
}, (opts) => getDesk.__executeServer(opts));
var getDesk = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getDesk_createServerFn_handler, async ({ context }) => {
	const sql = await getSql();
	const desk = await requireDesk(sql, context.userId);
	return deskView(sql, context.userId, desk.name, desk.role);
});
var saveRecording_createServerFn_handler = createServerRpc({
	id: "02f4f17e4832ff6a0a30e944bce9bce87dafeca49f5d0e30bb0eac0d61ae0d99",
	name: "saveRecording",
	filename: "src/lib/pulse/api.ts"
}, (opts) => saveRecording.__executeServer(opts));
var saveRecording = createServerFn({ method: "POST" }).validator((input) => {
	const title = clip(input?.title, 80);
	if (title.length < 2) fail("Die Aufnahme braucht einen Namen.");
	const durationMs = Math.round(asNum(input?.durationMs));
	if (durationMs < 800 || durationMs > 45e3) fail("Aufnahmen sind 1 bis 45 Sekunden lang.");
	return {
		title,
		mime: clipMime(input?.mime),
		audioBase64: clipAudio(input?.audioBase64),
		durationMs,
		air: input?.air === true
	};
}).middleware([authMiddleware]).handler(saveRecording_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const desk = await requireDesk(sql, context.userId);
		if (asNum((await sql`select count(*)::int as n from recordings`)[0]?.n) >= 40) fail("Höchstens 40 Aufnahmen. Ältere im Pult löschen.");
		const id = asNum((await sql`
        insert into recordings (title, mime, audio_base64, duration_ms, created_by, created_by_name)
        values (${data.title}, ${data.mime}, ${data.audioBase64}, ${data.durationMs}, ${context.userId}, ${desk.name})
        returning id
      `)[0]?.id);
		if (!id) fail("Aufnahme nicht gespeichert.");
		if (data.air) await airRecording(sql, context.userId, desk.name, id, data.title);
		return deskView(sql, context.userId, desk.name, desk.role);
	});
});
var playRecording_createServerFn_handler = createServerRpc({
	id: "23db349c7ce31b371608303f7d11f179009cc23f6c552ba814f1181cb41eb14c",
	name: "playRecording",
	filename: "src/lib/pulse/api.ts"
}, (opts) => playRecording.__executeServer(opts));
var playRecording = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Aufnahme fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(playRecording_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const desk = await requireDesk(sql, context.userId);
		const row = (await sql`select id, title from recordings where id = ${data.id}`)[0];
		if (!row) fail("Aufnahme nicht gefunden.");
		await airRecording(sql, context.userId, desk.name, data.id, clip(row.title, 80) || "Durchsage");
		return deskView(sql, context.userId, desk.name, desk.role);
	});
});
var deleteRecording_createServerFn_handler = createServerRpc({
	id: "3bff6bdad634a1d030e3b84eb37c0d5775ceb973884fbda3088b1ffb12504064",
	name: "deleteRecording",
	filename: "src/lib/pulse/api.ts"
}, (opts) => deleteRecording.__executeServer(opts));
var deleteRecording = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Aufnahme fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(deleteRecording_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const desk = await requireDesk(sql, context.userId);
		await sql`delete from recordings where id = ${data.id}`;
		return deskView(sql, context.userId, desk.name, desk.role);
	});
});
var getClip_createServerFn_handler = createServerRpc({
	id: "73bd71beb474da79631d32c25cc2daee00c5489575ffbf22929f5110b343e88e",
	name: "getClip",
	filename: "src/lib/pulse/api.ts"
}, (opts) => getClip.__executeServer(opts));
var getClip = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Aufnahme fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(getClip_createServerFn_handler, async ({ context, data }) => {
	const sql = await getSql();
	const identity = await loadIdentity(sql, context.userId);
	const member = await ensureMember(sql, context.userId, identity.name);
	if (!isDesk(member.role)) {
		if (!(await sql`
        select id from announcements
        where recording_id = ${data.id} and status in ('live', 'queued')
        limit 1
      `)[0]) fail("Diese Aufnahme ist nicht auf Sendung.");
	}
	const row = (await sql`select mime, audio_base64 from recordings where id = ${data.id}`)[0];
	if (!row) fail("Aufnahme nicht gefunden.");
	return {
		mime: asText(row.mime),
		audioBase64: asText(row.audio_base64)
	};
});
var addExternal_createServerFn_handler = createServerRpc({
	id: "069028915573be7272a6ede9486e4af4f3863ec7b78e58625444bfda8f98e726",
	name: "addExternal",
	filename: "src/lib/pulse/api.ts"
}, (opts) => addExternal.__executeServer(opts));
var addExternal = createServerFn({ method: "POST" }).validator((input) => {
	const url = clip(input?.url, 400);
	if (url.length < 8) fail("Link fehlt.");
	return { url };
}).middleware([authMiddleware]).handler(addExternal_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const desk = await requireDesk(sql, context.userId);
		const video = youtubeId(data.url);
		let track;
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
				durationMs: 18e4
			};
		} else {
			const audio = publicHttps(data.url, 500);
			if (!audio) fail("Nur öffentliche https-Links.");
			const path = new URL(audio).pathname.toLowerCase();
			if (!/\.(mp3|m4a|aac|ogg|wav)$/.test(path)) fail("YouTube-Link oder direkte Audiodatei (mp3, m4a, aac, ogg, wav).");
			track = {
				title: clip(decodeURIComponent(path.split("/").pop() ?? "Audio").replace(/\.[a-z0-9]+$/i, ""), 140) || "Audio",
				artist: "Link",
				album: "",
				artworkUrl: "",
				previewUrl: audio,
				source: "link",
				externalId: "",
				explicit: false,
				durationMs: 18e4
			};
		}
		const effective = await loadEffective(sql);
		if (isBlocked(track, effective.explicitFilter, parseWords(effective.extraBlocklist))) fail("Dieser Titel ist für das aktuelle Programm gesperrt.");
		await queueTrack(sql, context.userId, desk.name, track);
		await advancePlayback(sql);
		return { title: track.title };
	});
});
var saveStation_createServerFn_handler = createServerRpc({
	id: "5c83f74f0bf7a0c2b4fb5011df0bb5b711dac0f5dfea48e066c5a3c55c7c4d61",
	name: "saveStation",
	filename: "src/lib/pulse/api.ts"
}, (opts) => saveStation.__executeServer(opts));
var saveStation = createServerFn({ method: "POST" }).validator((input) => {
	const name = clip(input?.name, 80);
	const stream = publicHttps(clip(input?.streamUrl, 300));
	if (name.length < 2) fail("Der Sender braucht einen Namen.");
	if (!stream) fail("Nur öffentliche https-Streams.");
	return {
		name,
		streamUrl: stream,
		note: clip(input?.note, 160)
	};
}).middleware([authMiddleware]).handler(saveStation_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		await sql`
        insert into relay_stations (name, stream_url, note, created_by)
        values (${data.name}, ${data.streamUrl}, ${data.note}, ${context.userId})
      `;
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var deleteStation_createServerFn_handler = createServerRpc({
	id: "f53e39ccf799abe3373684a440a71031ace35f298525d4a150bddebc38af353d",
	name: "deleteStation",
	filename: "src/lib/pulse/api.ts"
}, (opts) => deleteStation.__executeServer(opts));
var deleteStation = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Sender fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(deleteStation_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		await sql`delete from relay_stations where id = ${data.id}`;
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var saveRelaySlot_createServerFn_handler = createServerRpc({
	id: "5b26076524b13768166bc9d84bf23d8b0e92048f14d7440ba6c28cfecb2da76b",
	name: "saveRelaySlot",
	filename: "src/lib/pulse/api.ts"
}, (opts) => saveRelaySlot.__executeServer(opts));
var saveRelaySlot = createServerFn({ method: "POST" }).validator((input) => {
	const stationId = asNum(input?.stationId);
	const title = clip(input?.title, 80);
	const startsAt = asIso(input?.startsAt);
	const endsAt = asIso(input?.endsAt);
	if (!stationId) fail("Sender fehlt.");
	if (title.length < 2) fail("Das Fenster braucht einen Namen.");
	if (!startsAt || !endsAt) fail("Beginn und Ende fehlen.");
	if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) fail("Das Ende liegt vor dem Beginn.");
	return {
		stationId,
		title,
		startsAt,
		endsAt
	};
}).middleware([authMiddleware]).handler(saveRelaySlot_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		if (!(await sql`select id from relay_stations where id = ${data.stationId}`)[0]) fail("Sender nicht gefunden.");
		await sql`
        insert into relay_slots (station_id, title, starts_at, ends_at, created_by)
        values (${data.stationId}, ${data.title}, ${data.startsAt}, ${data.endsAt}, ${context.userId})
      `;
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var deleteRelaySlot_createServerFn_handler = createServerRpc({
	id: "5291cc775da5f870db2d5e984847620db11237914ba5384a2f2854ab32dea9b5",
	name: "deleteRelaySlot",
	filename: "src/lib/pulse/api.ts"
}, (opts) => deleteRelaySlot.__executeServer(opts));
var deleteRelaySlot = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Fenster fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(deleteRelaySlot_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		await requireAdmin(sql, context.userId);
		await sql`delete from relay_slots where id = ${data.id}`;
		const base = await loadBaseSettings(sql);
		return {
			...await loadAdmin(sql, context.userId),
			settings: base
		};
	});
});
var startRelayNow_createServerFn_handler = createServerRpc({
	id: "34deabf4266979b9e3936f2f75f4b89ab920f5f77f84e7c66789c69c0f0d466f",
	name: "startRelayNow",
	filename: "src/lib/pulse/api.ts"
}, (opts) => startRelayNow.__executeServer(opts));
var startRelayNow = createServerFn({ method: "POST" }).validator((input) => {
	const stationId = asNum(input?.stationId);
	const minutes = Math.round(asNum(input?.minutes));
	if (!stationId) fail("Sender fehlt.");
	if (minutes !== 10 && minutes !== 30 && minutes !== 60) fail("10, 30 oder 60 Minuten.");
	return {
		stationId,
		minutes
	};
}).middleware([authMiddleware]).handler(startRelayNow_createServerFn_handler, async ({ context, data }) => {
	return withRadioLock(async () => {
		const sql = await getSql();
		const desk = await requireDesk(sql, context.userId);
		const found = await sql`select name from relay_stations where id = ${data.stationId}`;
		if (!found[0]) fail("Sender nicht gefunden.");
		const ends = new Date(Date.now() + data.minutes * 6e4).toISOString();
		await sql`
        insert into relay_slots (station_id, title, starts_at, ends_at, created_by)
        values (${data.stationId}, ${`Jetzt · ${asText(found[0].name)}`}, now(), ${ends}, ${context.userId})
      `;
		await advancePlayback(sql);
		return deskView(sql, context.userId, desk.name, desk.role);
	});
});
//#endregion
export { addExternal_createServerFn_handler, addPlaylistTrack_createServerFn_handler, addWish_createServerFn_handler, castVote_createServerFn_handler, checkOutput_createServerFn_handler, createPlaylist_createServerFn_handler, deletePlaylist_createServerFn_handler, deleteRecording_createServerFn_handler, deleteRelaySlot_createServerFn_handler, deleteRule_createServerFn_handler, deleteStation_createServerFn_handler, generateModeration_createServerFn_handler, getAdmin_createServerFn_handler, getClip_createServerFn_handler, getDesk_createServerFn_handler, getStation_createServerFn_handler, playRecording_createServerFn_handler, postAnnouncement_createServerFn_handler, removePlaylistTrack_createServerFn_handler, saveRecording_createServerFn_handler, saveRelaySlot_createServerFn_handler, saveRule_createServerFn_handler, saveSettings_createServerFn_handler, saveStation_createServerFn_handler, searchMusic_createServerFn_handler, setFallback_createServerFn_handler, setMemberRole_createServerFn_handler, skipTrack_createServerFn_handler, startRelayNow_createServerFn_handler, withdrawWish_createServerFn_handler };
