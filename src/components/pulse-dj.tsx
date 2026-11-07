/** Pult: eine Konsole. Oben was läuft, darunter der eine große Griff und der Laufplan. */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  addExternal,
  airPiper,
  deleteRecording,
  getClip,
  getDesk,
  playRecording,
  saveRecording,
  startRelayNow,
} from "@/lib/pulse/api";
import type { DeskSnapshot, PlanBlock } from "@/lib/pulse/types";
import { piperLine, speakPiper } from "@/lib/pulse/voice";
import { Button, Eq, Field, Panel, errorText, fieldClass, formatWhen } from "@/components/pulse-ui";
import { GuidePanel } from "@/components/pulse-guide";
import { CueTarget, StudioChrome } from "@/components/pulse-nav";
import { cn } from "@/lib/utils";

export function Desk() {
  const [data, setData] = useState<DeskSnapshot | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  async function load() {
    try {
      setData(await getDesk());
      setError("");
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 3000);
    const clock = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, []);

  const active = data?.plan.find((block) => block.active) ?? null;
  const later = data?.plan.filter((block) => !block.active && !block.past) ?? [];

  return (
    <div className="flex min-h-screen w-full flex-col pb-safe">
      <StudioChrome room="pult" role={data?.me.role ?? "dj"} />
      <main className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 gap-4 px-4 py-4 pb-10 sm:px-6">
        {!data && !error ? <p className="text-muted">Pult wird geladen.</p> : null}
        {error && !data ? (
          <Panel title="Kein Zugang">
            <p className="text-sm text-muted">{error}</p>
          </Panel>
        ) : null}
        {data ? (
          <>
            <GuidePanel role={data.me.role === "admin" ? "admin" : "dj"} />
            <AirStrip data={data} now={now} />
            <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
              <div className="grid min-w-0 gap-4">
                <CueTarget id="mikro">
                  <Mic onSaved={setData} />
                </CueTarget>
                <CueTarget id="laufplan">
                  <NowBlock block={active} later={later} />
                </CueTarget>
                <CueTarget id="stimme">
                  <Piper data={data} onSaved={setData} />
                </CueTarget>
              </div>
              <div className="grid min-w-0 gap-4">
                <CueTarget id="sender">
                  <RelayNow data={data} onSaved={setData} />
                </CueTarget>
                <CueTarget id="band">
                  <Recordings data={data} onSaved={setData} />
                </CueTarget>
                <CueTarget id="kennung">
                  <Cue upNext={data.upNext} />
                </CueTarget>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function AirStrip({ data, now }: { data: DeskSnapshot; now: number }) {
  const air = data.air;
  const live = air.mode !== "idle";
  const progress = air.startedAt
    ? Math.min(1, Math.max(0, (now - new Date(air.startedAt).getTime()) / Math.max(1, air.durationMs)))
    : 0;
  const clock = new Date(now).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-xl border border-line bg-surface px-4 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Eq live={live} />
          <div className="min-w-0">
            <p className={cn("text-xs font-medium uppercase tracking-wide", live ? "text-signal" : "text-subtle")}>
              {live ? "Auf Sendung" : "Pause"}
            </p>
            <p className="truncate text-sm text-muted">{live ? air.via : "Nichts läuft"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-4xl tabular-nums leading-none tracking-tight text-ink">{clock}</p>
          <p className="mt-2 text-xs tabular-nums text-subtle">Lautstärke {data.volume}</p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-subtle">Jetzt</p>
        <h1 className="mt-1 line-clamp-2 font-display text-4xl leading-none tracking-tight sm:text-5xl">{air.title}</h1>
        <p className="mt-2 truncate text-muted">{air.subtitle}</p>
      </div>
      <div className="h-1 overflow-hidden rounded-sm bg-surface-2">
        <div className="h-full bg-signal" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="flex items-baseline justify-between gap-3 text-xs text-subtle">
        <span className="shrink-0">{data.outputLabel}</span>
        <span className="min-w-0 truncate">
          {data.upNext[0] ? `Danach ${data.upNext[0].title}` : "Keine Wünsche in der Queue"}
        </span>
      </div>
    </section>
  );
}

function NowBlock({ block, later }: { block: PlanBlock | null; later: PlanBlock[] }) {
  const points = (block?.talkPoints ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <Panel title={block ? "Jetzt im Plan" : "Laufplan"}>
      {block ? (
        <div className="grid gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              {formatWhen(block.startsAt)} – {formatWhen(block.endsAt)}
              {block.stationName ? ` · ${block.stationName}` : ""}
            </p>
            <h3 className="mt-1 font-display text-3xl tracking-tight">{block.title}</h3>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md bg-surface-2 px-3 py-2">
              <dt className="text-subtle">Laut</dt>
              <dd className="tabular-nums">{block.volume ?? "Normal"}</dd>
            </div>
            <div className="rounded-md bg-surface-2 px-3 py-2">
              <dt className="text-subtle">Wünsche</dt>
              <dd>{block.wishesEnabled == null ? "—" : block.wishesEnabled ? "An" : "Aus"}</dd>
            </div>
            <div className="rounded-md bg-surface-2 px-3 py-2">
              <dt className="text-subtle">Energie</dt>
              <dd className="capitalize">{block.energy}</dd>
            </div>
          </dl>
          <p className="whitespace-pre-wrap text-sm text-ink">{block.djBrief || block.mood || "Keine Notiz aus der Regie."}</p>
          {points.length > 0 ? (
            <ol className="grid grid-cols-1 gap-2">
              {points.map((point, index) => (
                <li key={point} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] gap-3 text-sm">
                  <span className="font-display tabular-nums text-signal">{index + 1}</span>
                  <span className="min-w-0">{point}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">Gerade kein Block. Es gelten die Normalwerte der Regie.</p>
      )}
      {later.length > 0 ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-sm text-muted">Danach</h3>
          <ul className="grid grid-cols-1 gap-2">
            {later.slice(0, 4).map((item) => (
              <li key={item.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-line pt-2 text-sm">
                <span className="truncate text-ink">{item.title}</span>
                <span className="tabular-nums text-subtle">{formatWhen(item.startsAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

function Piper({ data, onSaved }: { data: DeskSnapshot; onSaved: (next: DeskSnapshot) => void }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Panel title={`Stimme · ${data.piperName}`}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void airPiper({ data: { title: "Durchsage", text } })
            .then(async () => {
              onSaved(await getDesk());
              toast.success(`${data.piperName} ist auf Sendung.`);
            })
            .catch((caught) => toast.error(errorText(caught)))
            .finally(() => setPending(false));
        }}
      >
        <textarea
          className="min-h-24 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          value={text}
          placeholder="Was gesagt werden soll"
          onChange={(event) => setText(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="line"
            onClick={() => speakPiper(text.trim().length >= 8 ? text : piperLine(data.piperVoice), data.piperVoice)}
          >
            Nur hier hören
          </Button>
          <Button type="submit" disabled={pending || text.trim().length < 8}>
            Auf Sendung
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function Mic({ onSaved }: { onSaved: (data: DeskSnapshot) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState("Durchsage");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 12 }, () => 0.15));
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef(0);
  const started = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const frame = useRef(0);

  useEffect(
    () => () => {
      window.clearInterval(timer.current);
      window.cancelAnimationFrame(frame.current);
      void audioCtx.current?.close();
    },
    [],
  );

  function watch(stream: MediaStream) {
    const ctx = new AudioContext();
    audioCtx.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      analyser.getByteFrequencyData(bins);
      const next = Array.from({ length: 12 }, (_, index) => {
        const start = Math.floor((index / 12) * bins.length);
        const end = Math.max(start + 1, Math.floor(((index + 1) / 12) * bins.length));
        let sum = 0;
        for (let i = start; i < end; i += 1) sum += bins[i] ?? 0;
        return Math.max(0.12, Math.min(1, sum / (end - start) / 180));
      });
      setLevels(next);
      frame.current = window.requestAnimationFrame(draw);
    };
    frame.current = window.requestAnimationFrame(draw);
  }

  async function begin() {
    setError("");
    setBlob(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((item) => MediaRecorder.isTypeSupported(item));
      const media = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        window.cancelAnimationFrame(frame.current);
        void audioCtx.current?.close();
        audioCtx.current = null;
        setLevels(Array.from({ length: 12 }, () => 0.15));
        const next = new Blob(chunks, { type: media.mimeType || "audio/webm" });
        setBlob(next);
        setPreview(URL.createObjectURL(next));
        setSeconds(Math.min(45, Math.max(1, Math.round((Date.now() - started.current) / 1000))));
      };
      recorder.current = media;
      started.current = Date.now();
      media.start();
      watch(stream);
      setRecording(true);
      setSeconds(0);
      window.clearInterval(timer.current);
      timer.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - started.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 45) media.stop();
      }, 250);
    } catch {
      setError("Mikrofon nicht verfügbar. Im Browser die Freigabe erlauben.");
    }
  }

  function stop() {
    window.clearInterval(timer.current);
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }

  async function store(air: boolean) {
    if (!blob) return;
    setPending(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      onSaved(
        await saveRecording({
          data: {
            title,
            mime: blob.type || "audio/webm",
            audioBase64,
            durationMs: Math.max(1000, seconds * 1000),
            air,
          },
        }),
      );
      setBlob(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      toast.success(air ? "Durchsage läuft." : "Aufnahme liegt im Pult.");
    } catch (caught) {
      toast.error(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Mikrofon</p>
          <h2 className="font-display text-3xl tracking-tight">{recording ? "Aufnahme läuft" : "Bereit"}</h2>
        </div>
        <p className="font-display text-4xl tabular-nums tracking-tight">{recording || blob ? `${seconds}s` : "45s"}</p>
      </div>
      <div className="flex h-16 min-w-0 items-end gap-1 overflow-hidden" aria-hidden="true">
        {levels.map((level, index) => (
          <span
            key={index}
            className={cn("min-w-0 flex-1 rounded-sm", recording ? "bg-signal" : "bg-surface-2")}
            style={{ height: `${Math.round(level * 100)}%` }}
          />
        ))}
      </div>
      <Field label="Name der Durchsage">
        <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
      </Field>
      {recording ? (
        <Button variant="danger" className="h-14 text-base" onClick={stop}>
          Stopp
        </Button>
      ) : (
        <Button className="h-14 text-base" onClick={() => void begin()}>
          Mikrofon öffnen
        </Button>
      )}
      {blob ? (
        <div className="grid gap-3">
          <audio controls src={preview} className="w-full" />
          <div className="flex flex-wrap gap-2">
            <Button variant="line" disabled={pending} onClick={() => void store(false)}>
              Ablegen
            </Button>
            <Button disabled={pending || title.trim().length < 2} onClick={() => void store(true)}>
              Auf Sendung
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}

function Recordings({ data, onSaved }: { data: DeskSnapshot; onSaved: (next: DeskSnapshot) => void }) {
  return (
    <Panel title="Aufnahmen">
      {data.recordings.length === 0 ? <p className="text-sm text-muted">Noch keine Carts.</p> : null}
      <ul className="grid min-w-0 grid-cols-1 gap-3">
        {data.recordings.map((item) => (
          <li key={item.id} className="grid gap-2 border-t border-line pt-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.title}</p>
              <p className="text-sm text-muted">
                {clock(item.durationMs)} · {item.createdByName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="line"
                onClick={() => {
                  void getClip({ data: { id: item.id } })
                    .then((clip) => {
                      const audio = new Audio(`data:${clip.mime};base64,${clip.audioBase64}`);
                      return audio.play();
                    })
                    .catch((caught) => toast.error(errorText(caught)));
                }}
              >
                Hören
              </Button>
              <Button
                onClick={() => {
                  void playRecording({ data: { id: item.id } })
                    .then((next) => {
                      onSaved(next);
                      toast.success("Läuft.");
                    })
                    .catch((caught) => toast.error(errorText(caught)));
                }}
              >
                Auf Sendung
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  void deleteRecording({ data: { id: item.id } })
                    .then(onSaved)
                    .catch((caught) => toast.error(errorText(caught)));
                }}
              >
                Weg
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RelayNow({ data, onSaved }: { data: DeskSnapshot; onSaved: (next: DeskSnapshot) => void }) {
  return (
    <Panel title="Sender">
      {data.stations.length === 0 ? <p className="text-sm text-muted">Noch keine Sender.</p> : null}
      <ul className="grid gap-3">
        {data.stations.map((station) => (
          <li key={station.id} className="grid gap-2 border-t border-line pt-3">
            <div>
              <p className="font-medium">{station.name}</p>
              <p className="text-sm text-muted">{station.note}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[10, 30, 60].map((minutes) => (
                <Button
                  key={minutes}
                  variant="line"
                  className="min-w-0 px-2"
                  onClick={() => {
                    void startRelayNow({ data: { stationId: station.id, minutes } })
                      .then((next) => {
                        onSaved(next);
                        toast.success(`${station.name} für ${minutes} Minuten.`);
                      })
                      .catch((caught) => toast.error(errorText(caught)));
                  }}
                >
                  {minutes} min
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Cue({ upNext }: { upNext: { title: string; artist: string }[] }) {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Panel title="Queue">
      {upNext.length === 0 ? <p className="mb-3 text-sm text-muted">Keine Wünsche. Es läuft die Standardmusik.</p> : null}
      {upNext.length > 0 ? (
        <ol className="mb-4 grid grid-cols-1 gap-2">
          {upNext.map((item, index) => (
            <li key={`${item.title}-${index}`} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] gap-3 text-sm">
              <span className="font-display tabular-nums text-subtle">{index + 1}</span>
              <span className="truncate">
                {item.title}
                <span className="text-muted"> · {item.artist}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void addExternal({ data: { url } })
            .then((result) => {
              setUrl("");
              toast.success(`${result.title} liegt in der Queue.`);
            })
            .catch((caught) => toast.error(errorText(caught)))
            .finally(() => setPending(false));
        }}
      >
        <input
          className={fieldClass}
          value={url}
          placeholder="YouTube oder Audiodatei"
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button type="submit" disabled={pending || url.trim().length < 8}>
          In die Queue
        </Button>
      </form>
    </Panel>
  );
}

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const index = text.indexOf(",");
      resolve(index >= 0 ? text.slice(index + 1) : text);
    };
    reader.onerror = () => reject(new Error("Aufnahme ließ sich nicht lesen."));
    reader.readAsDataURL(blob);
  });
}
