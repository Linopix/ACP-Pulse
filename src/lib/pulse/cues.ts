/**
 * Kurze Kennungen nur in diesem Browser. Sie gehen nicht auf Sendung
 * und nicht an Sonos oder den Receiver. Bei reduzierter Bewegung bleiben sie aus.
 */

type Cue = "ident" | "wish" | "tick" | "air" | "announce";

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  const Ctor = window.AudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

function tone(
  audio: AudioContext,
  time: number,
  freq: number,
  duration: number,
  level: number,
  type: OscillatorType = "sine",
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), time + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

/** Spielt eine Kennung, sobald der Browser Ton erlaubt. Leise, unter der Musik. */
export async function cue(kind: Cue): Promise<void> {
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") {
    try {
      await audio.resume();
    } catch {
      return;
    }
  }
  const now = audio.currentTime + 0.01;
  if (kind === "tick") {
    tone(audio, now, 740, 0.07, 0.03);
    return;
  }
  if (kind === "wish") {
    tone(audio, now, 440, 0.12, 0.04);
    tone(audio, now + 0.09, 660, 0.16, 0.045);
    return;
  }
  if (kind === "air") {
    tone(audio, now, 311, 0.22, 0.035);
    tone(audio, now + 0.08, 466, 0.28, 0.03);
    return;
  }
  if (kind === "announce") {
    tone(audio, now, 523, 0.14, 0.04);
    tone(audio, now + 0.12, 659, 0.14, 0.04);
    tone(audio, now + 0.24, 784, 0.22, 0.045);
    return;
  }
  tone(audio, now, 392, 0.18, 0.04);
  tone(audio, now + 0.16, 523, 0.32, 0.05);
}
