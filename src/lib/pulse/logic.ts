/**
 * Reine Regeln für Queue, Voting und Programm.
 * Kein Datenbankzugriff — dieselbe Logik für Server und Oberfläche.
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

export function voteBudget(queueLength: number): { up: number; down: number } {
  if (queueLength <= 0) return { up: 0, down: 0 };
  if (queueLength === 1) return { up: 0, down: 1 };
  // Höchstens ein Drittel, mindestens eine Stimme, nie die ganze Queue.
  const up = Math.max(1, Math.min(queueLength - 1, Math.ceil(queueLength / 3)));
  const down = Math.max(1, Math.ceil(queueLength / 4));
  return { up, down };
}

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

export function speechDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(50_000, Math.max(7_000, 2_500 + words * 420));
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 40;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampKick(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.max(2, Math.min(20, Math.round(value)));
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

export function outputLabel(target: OutputTarget, room: string): string {
  if (target === "sonos") return room.trim() ? `Sonos · ${room.trim()}` : "Sonos";
  if (target === "receiver") return "Receiver";
  return "Dieser Browser";
}

export type DeskRole = "admin" | "dj" | "listener";

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
