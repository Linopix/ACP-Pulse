/** Piper im Browser: weibliche deutsche Stimme, Kerstin ruhiger, Eva heller. */
import { piperVoice, type PiperVoiceId } from "@/lib/pulse/logic";

export function speakPiper(text: string, voiceId: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  const run = () => {
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const profile = piperVoice(voiceId);
    utter.lang = "de-DE";
    utter.rate = profile.id === "de_DE-eva_k-x_low" ? 1.02 : 0.96;
    utter.pitch = profile.id === "de_DE-eva_k-x_low" ? 1.16 : 1.05;
    const voice = pickFemale(synth.getVoices());
    if (voice) utter.voice = voice;
    synth.speak(utter);
  };
  if (synth.getVoices().length === 0) {
    synth.addEventListener("voiceschanged", run, { once: true });
    window.setTimeout(run, 250);
    return;
  }
  run();
}

export function piperLine(voiceId: PiperVoiceId | string): string {
  const voice = piperVoice(voiceId);
  return `Hier ist ${voice.name}. Ich spreche die Durchsagen für die Sendung.`;
}

function pickFemale(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const german = voices.filter((voice) => voice.lang.toLowerCase().startsWith("de"));
  const pool = german.length > 0 ? german : voices;
  const female = /female|frau|woman|kerstin|eva|anna|katja|helena|sara|petra|vicki|google deutsch/i;
  const male = /male|markus|stefan|hans|yannick/i;
  return pool.find((voice) => female.test(voice.name)) ?? pool.find((voice) => !male.test(voice.name)) ?? pool[0];
}
