/**
 * Reine Regeln für Queue, Voting und Programm.
 * Kein Datenbankzugriff — dieselbe Logik für Server und Oberfläche.
 * Was die Funktionen entscheiden, steht in der README unter Stimmen, Filter und Aufräumen.
 */

export const MAX_OPEN_WISHES = 3;

/** Standardliste für den strengen Event-Filter. Ergänzungen pflegt die Regie. */
export const DEFAULT_BLOCKLIST = [
  "fuck",
  "shit",
  "bitch",
  "nigga",
  "nigger",
  "whore",
  "slut",
  "fotze",
  "hurensohn",
  "schwuchtel",
];

export type FilterMode = "allow" | "clean" | "strict";
export type OutputTarget = "browser" | "sonos" | "receiver";
export type WishPruneMode = "off" | "auto";

export const DEFAULT_WISH_PRUNE_AT = 8;

/** Frische Wünsche bleiben kurz liegen, damit überhaupt eine Stimme ankommen kann. */
export const WISH_GRACE_MS = 90_000;

/** Komma-, Semikolon- oder zeilengetrennte Sperrwörter. Leer, kürzer als 2, länger als 40 und Duplikate fallen weg. */
export function parseWords(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const word = part.trim().toLowerCase();
    if (word.length < 2 || word.length > 40 || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
  }
  return out;
}

/**
 * Stimmen pro Person, abhängig von der Queue.
 * Hoch: höchstens ein Drittel, mindestens eine, nie die ganze Queue.
 * Bei einem Titel gibt es kein Hoch, nur ein Runter.
 */
export function voteBudget(queueLength: number): { up: number; down: number } {
  if (queueLength <= 0) return { up: 0, down: 0 };
  if (queueLength === 1) return { up: 0, down: 1 };
  // Höchstens ein Drittel, mindestens eine Stimme, nie die ganze Queue.
  const up = Math.max(1, Math.min(queueLength - 1, Math.ceil(queueLength / 3)));
  const down = Math.max(1, Math.ceil(queueLength / 4));
  return { up, down };
}

/**
 * `allow` lässt alles durch. `clean` sperrt nur das Explicit-Flag.
 * `strict` sperrt zusätzlich Titel oder Artist, die ein Sperrwort enthalten.
 */
export function isBlocked(
  track: { title: string; artist: string; explicit: boolean },
  filter: FilterMode,
  extraWords: string[],
): boolean {
  if (filter === "allow") return false;
  if (track.explicit) return true;
  if (filter !== "strict") return false;
  const hay = `${track.title} ${track.artist}`.toLowerCase();
  const words = [...DEFAULT_BLOCKLIST, ...extraWords];
  return words.some((word) => word.length > 0 && hay.includes(word));
}

/** Geschätzte Sprechdauer einer Text-Durchsage, zwischen 7 und 50 Sekunden. */
export function speechDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(50_000, Math.max(7_000, 2_500 + words * 420));
}

/** 0–100. Ungültige Werte werden 40. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 40;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Runter-Stimmen, ab denen ein Titel fliegt: 2–20, sonst 3. */
export function clampKick(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.max(2, Math.min(20, Math.round(value)));
}

/** Queue-Grenze fürs Aufräumen: 4–40, sonst 8. */
export function clampPruneAt(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_WISH_PRUNE_AT;
  return Math.max(4, Math.min(40, Math.round(value)));
}

/** Nächster Moderations-Slot, strikt in der Zukunft. */
export function nextSlot(slots: string, from = new Date()): Date | null {
  const times = slots
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^\d{2}:\d{2}$/.test(part));
  if (times.length === 0) return null;
  const candidates: Date[] = [];
  for (const dayOffset of [0, 1]) {
    for (const time of times) {
      const [hh, mm] = time.split(":").map(Number);
      const when = new Date(from);
      when.setDate(when.getDate() + dayOffset);
      when.setHours(hh ?? 0, mm ?? 0, 0, 0);
      if (when.getTime() > from.getTime() + 15_000) candidates.push(when);
    }
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] ?? null;
}

/** Anzeigename des Ausgangs in der Sendung. */
export function outputLabel(target: OutputTarget, room: string): string {
  if (target === "sonos") return room.trim() ? `Sonos · ${room.trim()}` : "Sonos";
  if (target === "receiver") return "Receiver";
  return "Dieser Browser";
}

export type DeskRole = "admin" | "dj" | "listener";

/** Pult: DJ und Regie. Hörer nicht. */
export function isDesk(role: string): boolean {
  return role === "admin" || role === "dj";
}

/** Offizieller Watch-, Shorts- oder youtu.be-Link. Kein Scraping. */
export function youtubeId(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const piece = (value: string) => (/^[\w-]{6,20}$/.test(value) ? value : null);
    if (host === "youtu.be") return piece(url.pathname.split("/").filter(Boolean)[0] ?? "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") return piece(url.searchParams.get("v") ?? "");
      const parts = url.pathname.split("/").filter(Boolean);
      if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1]) {
        return piece(parts[1]);
      }
    }
  } catch {
    return null;
  }
  return null;
}

export type PruneCandidate = {
  id: number;
  upvotes: number;
  downvotes: number;
  createdAt: number;
  playing: boolean;
};

/** Ohne Upvote, oder mehr Runter als Hoch (zum Beispiel 1 hoch, 2 runter). */
export function isWeakWish(item: { upvotes: number; downvotes: number }): boolean {
  return item.upvotes <= 0 || item.downvotes > item.upvotes;
}

/**
 * Automatisch nur, wenn die Queue die Grenze erreicht.
 * Manuell sofort, auch unter der Grenze und ohne Schonfrist.
 * Der laufende Titel bleibt.
 */
export function wishesToPrune(
  items: PruneCandidate[],
  opts: { mode: WishPruneMode; threshold: number; manual?: boolean },
  now = Date.now(),
): number[] {
  const queued = items.filter((item) => !item.playing);
  if (!opts.manual && (opts.mode !== "auto" || queued.length < opts.threshold)) return [];
  return queued
    .filter((item) => {
      if (!opts.manual && now - item.createdAt < WISH_GRACE_MS) return false;
      return isWeakWish(item);
    })
    .map((item) => item.id);
}

export type PiperVoiceId = "de_DE-kerstin-low" | "de_DE-eva_k-x_low";

/** Nur weibliche Piper-Stimmen. Kerstin ist die Sendestimme. */
export const PIPER_VOICES: { id: PiperVoiceId; name: string; detail: string }[] = [
  { id: "de_DE-kerstin-low", name: "Kerstin", detail: "weiblich, Deutsch, ruhig" },
  { id: "de_DE-eva_k-x_low", name: "Eva", detail: "weiblich, Deutsch, heller" },
];

export function piperVoice(id: string): { id: PiperVoiceId; name: string; detail: string } {
  return PIPER_VOICES.find((voice) => voice.id === id) ?? PIPER_VOICES[0]!;
}

/** Lautstärke-Wünsche, die die Regie einem Block geben kann. */
export const VOLUME_WISHES = [
  { id: "foyer", label: "Foyer", volume: 22, note: "Gespräche bleiben verständlich." },
  { id: "buero", label: "Büro", volume: 36, note: "Hintergrund, nicht im Vordergrund." },
  { id: "pause", label: "Pause", volume: 50, note: "Deutlich, noch kein Club." },
  { id: "event", label: "Event", volume: 64, note: "Der Raum darf die Musik hören." },
] as const;

export type PlanKind = "musik" | "pause" | "meeting" | "ansage" | "relais" | "event";
export type PlanEnergy = "leise" | "mittel" | "hoch";

export function asPlanKind(value: string): PlanKind {
  if (value === "pause" || value === "meeting" || value === "ansage" || value === "relais" || value === "event") {
    return value;
  }
  return "musik";
}

export function asPlanEnergy(value: string): PlanEnergy {
  if (value === "leise" || value === "hoch") return value;
  return "mittel";
}

export type IcsEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  description: string;
  uid: string;
};

/** Outlook-Export (.ics). Faltungen, lokale Zeiten und UTC. Höchstens 40 Termine. */
export function parseIcs(raw: string): IcsEvent[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  const out: IcsEvent[] = [];
  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0] ?? "";
    const fields = new Map<string, string>();
    for (const line of body.split("\n")) {
      const idx = line.indexOf(":");
      if (idx < 1) continue;
      const key = line.slice(0, idx).split(";")[0]?.trim().toUpperCase() ?? "";
      if (!key || fields.has(key)) continue;
      fields.set(key, line.slice(idx + 1).trim());
    }
    const title = unescapeIcs(fields.get("SUMMARY") ?? "").slice(0, 80);
    const starts = icsDate(fields.get("DTSTART") ?? "");
    const ends = icsDate(fields.get("DTEND") ?? "") ?? (starts ? new Date(starts.getTime() + 30 * 60_000) : null);
    if (title.length < 2 || !starts || !ends || ends.getTime() <= starts.getTime()) continue;
    const uid = unescapeIcs(fields.get("UID") ?? "") || `${starts.toISOString()}|${title}`;
    out.push({
      title,
      startsAt: starts.toISOString(),
      endsAt: ends.toISOString(),
      description: unescapeIcs(fields.get("DESCRIPTION") ?? "").slice(0, 500),
      uid: uid.slice(0, 180),
    });
  }
  return out.slice(0, 40);
}

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").trim();
}

function icsDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/.exec(v);
  if (!match) {
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");
  const second = Number(match[6] ?? "0");
  if (match[7]) return new Date(Date.UTC(year, month, day, hour, minute, second));
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Freitext aus Outlook oder der Regie wird zu Lautstärke und Wunscherlaubnis.
 * Ohne Hinweis bleibt beides unverändert (null).
 */
export function wishFromText(text: string): { volume: number | null; wishesEnabled: boolean | null; wishNote: string } {
  const hay = text.toLowerCase();
  let volume: number | null = null;
  let wishesEnabled: boolean | null = null;
  if (/leise|flüster|fluester|hintergrund|meeting|besprechung|call|jour fixe/.test(hay)) volume = 24;
  if (/laut|party|feier|event|mittag/.test(hay)) volume = 58;
  if (/keine wünsche|wuensche aus|wünsche aus|wunschfrei/.test(hay)) wishesEnabled = false;
  if (/wünsche an|wuensche an|wunschbox/.test(hay)) wishesEnabled = true;
  return { volume, wishesEnabled, wishNote: text.trim().slice(0, 240) };
}
