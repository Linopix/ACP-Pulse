/** Kurze Führung. Einmal pro Browser, danach nur noch über den Knopf. Schritte hängen an der Rolle. */
import { useEffect } from "react";
import { create } from "zustand";
import type { DeskRole } from "@/lib/pulse/logic";
import { Button, Panel } from "@/components/pulse-ui";

const seenKey = "pulse-guide-seen";

type GuideState = {
  open: boolean;
  step: number;
  show: () => void;
  close: () => void;
  setStep: (step: number) => void;
};

export const useGuide = create<GuideState>((set) => ({
  open: false,
  step: 0,
  show: () => set({ open: true, step: 0 }),
  close: () => {
    try {
      localStorage.setItem(seenKey, "1");
    } catch {
      // Führung bleibt trotzdem schließbar.
    }
    set({ open: false });
  },
  setStep: (step) => set({ step }),
}));

function stepsFor(role: DeskRole) {
  const steps = [
    {
      title: "Die Sendung",
      body: "Alle hören dieselbe Queue. Was hier läuft, läuft fürs ganze Team.",
    },
    {
      title: "Hören",
      body: "Blockt der Browser den Ton, «Sendung hören» tippen. Dabei kommt eine kurze Kennung. «Leise hier» gilt nur für dieses Gerät, auch für die Kennungen.",
    },
    {
      title: "Wünschen",
      body: "Suchen, dann Dazu. Drei offene Wünsche pro Person. 30 Sekunden, ganze Titel, und wenn die Regie sie angeschaltet hat YouTube oder Spotify.",
    },
    {
      title: "Stimmen",
      body: "Hoch und Runter sortieren die Queue. Das Kontingent wächst mit, reicht aber nie für jeden Titel. Wird die Queue voll, fliegen Wünsche ohne Upvote oder mit mehr Gegenstimmen — etwa einer hoch, zwei runter. Ganz neue bleiben kurz liegen, damit eine Stimme ankommen kann.",
    },
  ];
  if (role === "listener") {
    steps.push({
      title: "Pult und Regie",
      body: "Durchsagen, Sender und wohin der Ton geht, macht das Team mit Pult und Regie.",
    });
  }
  if (role === "dj" || role === "admin") {
    steps.push({
      title: "Pult",
      body: "Oben dieselbe Leiste: 01 Sendung, 02 Pult, 03 Regie. Im Pult springst du zu Laufplan, Stimme, Mikrofon, Aufnahmen, Sender und Kennung. Mikrofon und Piper unterbrechen die Musik.",
    });
  }
  if (role === "admin") {
    steps.push({
      title: "Die Regie",
      body: "Das Brett hat vier Felder: Ton, Tag, Quellen, Haus. Kanal 01 bis 09, dieselbe Schrift wie die Leiste oben.",
    });
    steps.push({
      title: "Wohin der Ton geht",
      body: "Browser spielt hier. Sonos und Boxen spielen über den Receiver. «Verbindung prüfen» sagt, ob die Befehle ankommen. Ohne Sonos-Gerät antwortet der Testlautsprecher im Receiver.",
    });
    steps.push({
      title: "Programm",
      body: "Filter, Kalender und Playlists gelten für alle. Unter Programm stellst du ein, ab wie vielen Wünschen schwache Titel automatisch rausfliegen. «Jetzt aufräumen» macht das sofort.",
    });
  }
  return steps;
}

export function GuideButton() {
  const show = useGuide((state) => state.show);
  return (
    <button type="button" onClick={show} className="inline-flex h-11 items-center rounded-md px-2 text-sm text-muted sm:px-3">
      Führung
    </button>
  );
}

export function GuidePanel({ role }: { role: DeskRole }) {
  const open = useGuide((state) => state.open);
  const step = useGuide((state) => state.step);
  const close = useGuide((state) => state.close);
  const setStep = useGuide((state) => state.setStep);
  const steps = stepsFor(role);
  const index = Math.min(step, steps.length - 1);
  const current = steps[index];

  useEffect(() => {
    try {
      if (!localStorage.getItem(seenKey)) useGuide.getState().show();
    } catch {
      // Ohne Speicher bleibt die Führung über den Knopf erreichbar.
    }
  }, []);

  if (!open || !current) return null;
  return (
    <Panel title={current.title} action={<span className="text-xs tabular-nums text-subtle">{index + 1} / {steps.length}</span>}>
      <p className="max-w-xl text-sm text-muted">{current.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {index > 0 ? (
          <Button variant="line" onClick={() => setStep(index - 1)}>
            Zurück
          </Button>
        ) : null}
        {index < steps.length - 1 ? (
          <Button onClick={() => setStep(index + 1)}>Weiter</Button>
        ) : (
          <Button onClick={close}>Fertig</Button>
        )}
        <Button variant="ghost" onClick={close}>
          Später
        </Button>
      </div>
    </Panel>
  );
}
