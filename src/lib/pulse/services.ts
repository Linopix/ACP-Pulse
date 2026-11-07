/**
 * Fremde Musik- und Kalenderdienste.
 * Keine Geheimnisse in den Rückgaben. Schlüssel bleiben in service_links.
 */
import { youtubeId } from "@/lib/pulse/logic";
import type { TrackInput } from "@/lib/pulse/types";

type O365Event = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  body: string;
};

const INNERTUBE = "https://www.youtube.com/youtubei/v1/search?prettyPrint=false";

export async function searchYoutube(query: string, apiKey: string): Promise<TrackInput[]> {
  const pasted = youtubeId(query);
  if (pasted) return [await youtubeById(pasted)];
  if (apiKey) {
    try {
      const hits = await youtubeData(query, apiKey);
      if (hits.length > 0) return hits;
    } catch {
      // Schlüssel kann fehlen oder die Quote leer sein. Danach die öffentliche Suche.
    }
  }
  try {
    const hits = await youtubeInnertube(query);
    if (hits.length > 0) return hits;
  } catch {
    // nächster Weg
  }
  const instances = ["https://inv.nadeko.net", "https://invidious.nerdvpn.de", "https://yt.artemislena.eu"];
  for (const origin of instances) {
    try {
      const hits = await invidious(origin, query);
      if (hits.length > 0) return hits;
    } catch {
      // nächste Instanz
    }
  }
  throw new Error("YouTube-Suche gerade nicht erreichbar. Ein Watch-Link geht trotzdem.");
}

async function youtubeById(id: string): Promise<TrackInput> {
  const url = new URL("https://www.youtube.com/oembed");
  url.searchParams.set("url", `https://www.youtube.com/watch?v=${id}`);
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("YouTube kennt diesen Link nicht.");
  const body = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
  const title = clip(body.title, 140);
  if (!title) throw new Error("YouTube hat keinen Titel geliefert.");
  return track({
    title,
    artist: clip(body.author_name, 140) || "YouTube",
    artworkUrl: https(body.thumbnail_url),
    externalId: id,
    durationMs: 180_000,
  });
}

async function youtubeData(query: string, apiKey: string): Promise<TrackInput[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10");
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("YouTube-Schlüssel abgelehnt.");
  const body = (await res.json()) as {
    items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }[];
  };
  return (body.items ?? []).flatMap((item) => {
    const id = item.id?.videoId ?? "";
    const title = clip(item.snippet?.title, 140);
    if (!id || !title) return [];
    return [
      track({
        title,
        artist: clip(item.snippet?.channelTitle, 140) || "YouTube",
        artworkUrl: https(item.snippet?.thumbnails?.medium?.url),
        externalId: id,
        durationMs: 180_000,
      }),
    ];
  });
}

async function youtubeInnertube(query: string): Promise<TrackInput[]> {
  const res = await fetch(INNERTUBE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion: "2.20241126.01.00", hl: "de", gl: "DE" } },
      query,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("YouTube antwortet nicht.");
  const body = (await res.json()) as {
    contents?: {
      twoColumnSearchResultsRenderer?: {
        primaryContents?: {
          sectionListRenderer?: {
            contents?: {
              itemSectionRenderer?: {
                contents?: {
                  videoRenderer?: {
                    videoId?: string;
                    title?: { runs?: { text?: string }[] };
                    ownerText?: { runs?: { text?: string }[] };
                    lengthText?: { simpleText?: string };
                    thumbnail?: { thumbnails?: { url?: string }[] };
                  };
                }[];
              };
            }[];
          };
        };
      };
    };
  };
  const sections = body.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];
  const found: TrackInput[] = [];
  for (const section of sections) {
    for (const item of section.itemSectionRenderer?.contents ?? []) {
      const video = item.videoRenderer;
      const id = video?.videoId ?? "";
      const title = clip(video?.title?.runs?.map((part) => part.text ?? "").join(""), 140);
      if (!/^[\w-]{6,20}$/.test(id) || !title) continue;
      const art = video?.thumbnail?.thumbnails?.at(-1)?.url ?? "";
      found.push(
        track({
          title,
          artist: clip(video?.ownerText?.runs?.[0]?.text, 140) || "YouTube",
          artworkUrl: https(art.startsWith("//") ? `https:${art}` : art),
          externalId: id,
          durationMs: clockToMs(video?.lengthText?.simpleText) || 180_000,
        }),
      );
      if (found.length >= 8) return found;
    }
  }
  return found;
}

async function invidious(origin: string, query: string): Promise<TrackInput[]> {
  const url = new URL("/api/v1/search", origin);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error("Instanz nicht erreichbar.");
  const body = (await res.json()) as {
    title?: string;
    author?: string;
    videoId?: string;
    lengthSeconds?: number;
    videoThumbnails?: { url?: string }[];
  }[];
  if (!Array.isArray(body)) return [];
  return body.slice(0, 8).flatMap((hit) => {
    const id = hit.videoId ?? "";
    const title = clip(hit.title, 140);
    if (!/^[\w-]{6,20}$/.test(id) || !title) return [];
    return [
      track({
        title,
        artist: clip(hit.author, 140) || "YouTube",
        artworkUrl: https(hit.videoThumbnails?.[0]?.url),
        externalId: id,
        durationMs: Math.max(15_000, Math.min(15 * 60_000, (hit.lengthSeconds ?? 180) * 1000)),
      }),
    ];
  });
}

export async function spotifyToken(clientId: string, secret: string): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("Spotify hat Client-ID oder Geheimnis abgelehnt.");
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Spotify hat kein Token geliefert.");
  return body.access_token;
}

export async function searchSpotify(query: string, clientId: string, secret: string): Promise<TrackInput[]> {
  if (!clientId || !secret) {
    throw new Error("Spotify ist noch nicht verbunden. In der Regie unter Dienste Client-ID und Geheimnis eintragen.");
  }
  const token = await spotifyToken(clientId, secret);
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "8");
  url.searchParams.set("q", query);
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("Spotify-Suche gerade nicht erreichbar.");
  const body = (await res.json()) as {
    tracks?: {
      items?: {
        id?: string;
        name?: string;
        explicit?: boolean;
        duration_ms?: number;
        preview_url?: string | null;
        artists?: { name?: string }[];
        album?: { name?: string; images?: { url?: string }[] };
      }[];
    };
  };
  const items = body.tracks?.items ?? [];
  const hits = await Promise.all(
    items.map(async (item) => {
      const title = clip(item.name, 140);
      const artist = clip(item.artists?.map((person) => person.name).filter(Boolean).join(", "), 140);
      if (!title || !artist || !item.id) return null;
      let preview = https(item.preview_url);
      if (!preview) preview = await itunesPreview(artist, title);
      return track({
        title,
        artist,
        album: clip(item.album?.name, 160),
        artworkUrl: https(item.album?.images?.[0]?.url),
        previewUrl: preview,
        externalId: item.id,
        explicit: item.explicit === true,
        durationMs: preview && !item.preview_url ? 30_000 : Math.max(15_000, item.duration_ms || 180_000),
        source: "spotify",
      });
    }),
  );
  return hits.flatMap((hit) => (hit ? [hit] : []));
}

async function itunesPreview(artist: string, title: string): Promise<string> {
  try {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", `${artist} ${title}`);
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "3");
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return "";
    const body = (await res.json()) as { results?: { previewUrl?: string; trackName?: string }[] };
    const hit = body.results?.find((row) => row.previewUrl);
    return https(hit?.previewUrl);
  } catch {
    return "";
  }
}

export async function graphToken(tenant: string, clientId: string, secret: string): Promise<string> {
  const url = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("Microsoft 365 hat Mandant, Client-ID oder Geheimnis abgelehnt.");
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Microsoft 365 hat kein Token geliefert.");
  return json.access_token;
}

export async function graphEvents(opts: {
  tenant: string;
  clientId: string;
  secret: string;
  mailbox: string;
}): Promise<O365Event[]> {
  if (!opts.tenant || !opts.clientId || !opts.secret || !opts.mailbox) {
    throw new Error("Microsoft 365 ist unvollständig. Mandant, Client-ID, Geheimnis und Postfach fehlen.");
  }
  const token = await graphToken(opts.tenant, opts.clientId, opts.secret);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000);
  const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(opts.mailbox)}/calendarView`);
  url.searchParams.set("startDateTime", start.toISOString());
  url.searchParams.set("endDateTime", end.toISOString());
  url.searchParams.set("$select", "id,subject,bodyPreview,start,end,isCancelled");
  url.searchParams.set("$orderby", "start/dateTime");
  url.searchParams.set("$top", "40");
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, prefer: 'outlook.timezone="Europe/Berlin"' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("Kalender nicht lesbar. Die App braucht Calendars.Read und das Postfach.");
  const json = (await res.json()) as {
    value?: {
      id?: string;
      subject?: string;
      bodyPreview?: string;
      isCancelled?: boolean;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    }[];
  };
  return (json.value ?? []).flatMap((item) => {
    if (item.isCancelled) return [];
    const title = clip(item.subject, 80);
    const startsAt = graphDate(item.start?.dateTime);
    const endsAt = graphDate(item.end?.dateTime);
    if (!title || !startsAt || !endsAt || endsAt <= startsAt) return [];
    return [{ id: item.id || `${startsAt}|${title}`, title, startsAt, endsAt, body: clip(item.bodyPreview, 500) }];
  });
}

export async function fetchPiper(
  endpoint: string,
  text: string,
  voice: string,
): Promise<{ mime: string; audioBase64: string } | null> {
  if (!endpoint) return null;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "audio/wav, audio/mpeg, audio/*" },
    body: JSON.stringify({ text, voice }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error("Piper-Adresse antwortet nicht.");
  const mime = (res.headers.get("content-type") ?? "audio/wav").split(";")[0]?.trim() || "audio/wav";
  if (!mime.startsWith("audio/")) throw new Error("Piper hat keine Audiodatei geliefert.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength < 64 || bytes.byteLength > 1_200_000) throw new Error("Piper-Datei ist leer oder zu groß.");
  return { mime: mime === "audio/wave" ? "audio/wav" : mime, audioBase64: bytesToBase64(bytes) };
}

function graphDate(value: string | undefined): string {
  if (!value) return "";
  const hasZone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function track(input: {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  previewUrl?: string;
  externalId: string;
  explicit?: boolean;
  durationMs: number;
  source?: TrackInput["source"];
}): TrackInput {
  return {
    title: input.title,
    artist: input.artist,
    album: input.album ?? "",
    artworkUrl: input.artworkUrl ?? "",
    previewUrl: input.previewUrl ?? "",
    source: input.source ?? "youtube",
    externalId: input.externalId,
    explicit: input.explicit === true,
    durationMs: input.durationMs,
  };
}

function clockToMs(value: string | undefined): number {
  if (!value) return 0;
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return Math.max(0, Math.min(15 * 60_000, seconds * 1000));
}

function clip(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function https(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text.startsWith("https://")) return "";
  return text.slice(0, 400);
}
