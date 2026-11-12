/** Kurze Führung. Hörer bekommen ein eigenes Onboarding, ohne Pult oder Regie. */
import { useEffect } from "react";
import { create } from "zustand";
import { Check, Radio, Search, ThumbsUp, Volume2, type LucideIcon } from "lucide-react";
import type { DeskRole } from "@/lib/pulse/logic";
import { Button, Panel } from "@/components/pulse-ui";

const deskKey = "pulse-guide-seen";
const listenerKey = "pulse-onboard-seen";

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
  close: () => set({ open: false }),
  setStep: (step) => set({ step }),
}));

const sourceName: Record<string, string> = {
  preview: "der 30-Sekunden-Vorschau",
  archive: "den ganzen Titeln",
  youtube: "YouTube",
  spotify: "Spotify",
};

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
      body: "Suchen, dann Dazu. Drei offene Wünsche pro Person. Hörer sehen nur die Quelle, die unter Programm gewählt ist. Am Pult bleiben die anderen Kataloge offen.",
    },
    {
      title: "Stimmen",
      body: "Hoch und Runter sortieren die Queue. Das Kontingent wächst mit, reicht aber nie für jeden Titel. Wird die Queue voll, fliegen Wünsche ohne Upvote oder mit mehr Gegenstimmen — etwa einer hoch, zwei runter. Ganz neue bleiben kurz liegen, damit eine Stimme ankommen kann.",
    },
  ];
  if (role === "dj" || role === "admin") {
    steps.push({
      title: "Pult",
      body: "Oben dieselbe Leiste: 01 Sendung, 02 Pult, 03 Regie. Das Pult zeigt zuerst, was läuft, dann das Mikrofon und den Laufplan. Rechts Sender, Aufnahmen und die Queue. Mikrofon und Piper unterbrechen die Musik.",
    });
  }
  if (role === "admin") {
    steps.push({
      title: "Die Regie",
      body: "Das Brett hat vier Felder: Ton, Tag, Quellen, Haus. Kanal 01 bis 11, dieselbe Schrift wie die Leiste oben. Bereiche und Debug sitzen unter Ton und Haus.",
    });
    steps.push({
      title: "Wohin der Ton geht",
      body: "Browser spielt hier. Sonos und Boxen spielen über den Receiver. Pult und Regie können den Ton trotzdem lokal anschalten. «Verbindung prüfen» sagt, ob die Befehle ankommen.",
    });
    steps.push({
      title: "Programm",
      body: "Die Musikquelle gilt für alle Hörer. Filter, Kalender und Playlists auch. Unter Programm stellst du ein, ab wie vielen Wünschen schwache Titel automatisch rausfliegen.",
    });
  }
  return steps;
}

function remember(role: DeskRole) {
  try {
    localStorage.setItem(role === "listener" ? listenerKey : deskKey, "1");
  } catch {
    // Führung bleibt trotzdem schließbar.
  }
}

export function GuideButton() {
  const show = useGuide((state) => state.show);
  return (
    <button type="button" onClick={show} className="inline-flex h-11 items-center rounded-md px-2 text-sm text-muted sm:px-3">
      Führung
    </button>
  );
}

export function GuidePanel({
  role,
  name = "",
  source = "preview",
}: {
  role: DeskRole;
  name?: string;
  source?: string;
}) {
  const open = useGuide((state) => state.open);
  const step = useGuide((state) => state.step);
  const close = useGuide((state) => state.close);
  const setStep = useGuide((state) => state.setStep);

  useEffect(() => {
    try {
      const key = role === "listener" ? listenerKey : deskKey;
      if (!localStorage.getItem(key)) useGuide.getState().show();
    } catch {
      // Ohne Speicher bleibt die Führung über den Knopf erreichbar.
    }
  }, [role]);

  function dismiss() {
    remember(role);
    close();
  }

  if (role === "listener") {
    return (
      <ListenerOnboarding
        open={open}
        step={step}
        name={name}
        source={source}
        onStep={setStep}
        onClose={dismiss}
      />
    );
  }

  const steps = stepsFor(role);
  const index = Math.min(step, steps.length - 1);
  const current = steps[index];
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
          <Button onClick={dismiss}>Fertig</Button>
        )}
        <Button variant="ghost" onClick={dismiss}>
          Später
        </Button>
      </div>
    </Panel>
  );
}

const listenerSteps: { title: string; body: (source: string) => string; icon: LucideIcon }[] = [
  {
    title: "Willkommen in der Sendung",
    body: () => "Du hörst mit. Dieselbe Musik fürs ganze Team. Pult und Regie bleiben beim Team, du bekommst keine Sonderrechte.",
    icon: Radio,
  },
  {
    title: "Ton auf diesem Gerät",
    body: () => "Tippe «Sendung hören», wenn der Browser still bleibt. «Leise hier» gilt nur für diesen Bildschirm.",
    icon: Volume2,
  },
  {
    title: "Eine Quelle für Wünsche",
    body: (source) =>
      `Die Regie hat ${sourceName[source] ?? "eine Quelle"} gewählt. Du suchst dort, tippst Dazu und hast höchstens drei offene Titel.`,
    icon: Search,
  },
  {
    title: "Die Queue entscheidet",
    body: () => "Hoch und Runter sortieren, was als Nächstes läuft. Das Kontingent reicht nicht für jeden Titel. Schwache Wünsche fallen weg, wenn die Queue voll ist.",
    icon: ThumbsUp,
  },
  {
    title: "Du bist dabei",
    body: () => "Mehr brauchst du nicht. Durchsagen, Sender und wohin der Ton geht, macht das Team.",
    icon: Check,
  },
];

function ListenerOnboarding({
  open,
  step,
  name,
  source,
  onStep,
  onClose,
}: {
  open: boolean;
  step: number;
  name: string;
  source: string;
  onStep: (step: number) => void;
  onClose: () => void;
}) {
  const index = Math.min(Math.max(step, 0), listenerSteps.length - 1);
  const current = listenerSteps[index]!;
  const Icon = current.icon;
  const first = name.trim().split(/\s+/)[0] ?? "";
  const last = index === listenerSteps.length - 1;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-canvas/80 p-4 backdrop-blur-sm sm:place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
        className="rise grid w-full max-w-md gap-6 rounded-xl border border-line bg-surface p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-subtle">Einführung{first ? ` für ${first}` : ""}</p>
          <p className="text-sm tabular-nums text-subtle">
            {index + 1} / {listenerSteps.length}
          </p>
        </div>
        <div key={index} className="rise grid gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-surface-2 text-signal">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="grid gap-2">
            <h2 id="onboard-title" className="font-display text-3xl leading-tight tracking-tight">
              {current.title}
            </h2>
            <p className="text-sm text-muted">{current.body(source)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" aria-hidden="true">
          {listenerSteps.map((item, dot) => (
            <span
              key={item.title}
              className={dot === index ? "h-1.5 w-6 rounded-full bg-signal" : "h-1.5 w-1.5 rounded-full bg-line"}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {index > 0 ? (
            <Button variant="line" onClick={() => onStep(index - 1)}>
              Zurück
            </Button>
          ) : null}
          {last ? (
            <Button onClick={onClose}>Loslegen</Button>
          ) : (
            <Button onClick={() => onStep(index + 1)}>Weiter</Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Später
          </Button>
        </div>
      </div>
    </div>
  );
}
