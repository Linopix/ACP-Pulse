import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import {
  addExternal,
  deleteRecording,
  getClip,
  getDesk,
  playRecording,
  saveRecording,
  startRelayNow,
} from "@/lib/pulse/api";
import type { DeskSnapshot } from "@/lib/pulse/types";
import { Button, Field, Panel, TopBar, errorText, fieldClass, formatWhen } from "@/components/pulse-ui";

export function Desk() {
  const [data, setData] = useState<DeskSnapshot | null>(null);
  const [error, setError] = useState("");

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
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col pb-safe">
      <TopBar>
        <Link to="/" className="inline-flex h-11 items-center rounded-md px-3 text-sm text-ink">
          Sendung
        </Link>
        {data?.me.role === "admin" ? (
          <Link to="/admin" className="inline-flex h-11 items-center rounded-md px-3 text-sm text-ink">
            Regie
          </Link>
        ) : null}
        <UserButton />
      </TopBar>
      <main className="grid w-full min-w-0 grid-cols-1 gap-4 px-4 pb-10 sm:px-6">
        <div className="grid gap-2">
          <h1 className="font-display text-4xl tracking-tight">Pult</h1>
          <p className="max-w-2xl text-sm text-muted">
            Mikrofon und Aufnahmen unterbrechen die Musik. Sender können sofort oder nach dem Zeitplan aus der Regie
            übernehmen.
          </p>
        </div>
        {!data && !error ? <p className="text-muted">Pult wird geladen.</p> : null}
        {error && !data ? (
          <Panel title="Kein Zugang">
            <p className="text-sm text-muted">{error}</p>
          </Panel>
        ) : null}
        {data ? (
          <>
            <Mic onSaved={setData} />
            <Recordings data={data} onSaved={setData} />
            <RelayNow data={data} onSaved={setData} />
            <Cue />
          </>
        ) : null}
      </main>
    </div>
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
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef(0);
  const started = useRef(0);

  useEffect(() => () => window.clearInterval(timer.current), []);

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
        const next = new Blob(chunks, { type: media.mimeType || "audio/webm" });
        setBlob(next);
        setPreview(URL.createObjectURL(next));
        setSeconds(Math.min(45, Math.max(1, Math.round((Date.now() - started.current) / 1000))));
      };
      recorder.current = media;
      started.current = Date.now();
      media.start();
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
    <Panel title="Mikrofon">
      <div className="grid gap-3">
        <p className="text-sm text-muted">Bis 45 Sekunden. Auf Sendung unterbricht den laufenden Titel.</p>
        <Field label="Name">
          <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          {recording ? (
            <Button variant="danger" onClick={stop}>
              Stopp · {seconds}s
            </Button>
          ) : (
            <Button onClick={() => void begin()}>Aufnahme starten</Button>
          )}
          {blob ? (
            <>
              <Button variant="line" disabled={pending} onClick={() => void store(false)}>
                Ablegen
              </Button>
              <Button disabled={pending || title.trim().length < 2} onClick={() => void store(true)}>
                Auf Sendung
              </Button>
            </>
          ) : null}
        </div>
        {preview ? <audio controls src={preview} className="w-full" /> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Panel>
  );
}

function Recordings({ data, onSaved }: { data: DeskSnapshot; onSaved: (next: DeskSnapshot) => void }) {
  return (
    <Panel title="Aufzeichnungen">
      {data.recordings.length === 0 ? <p className="text-sm text-muted">Noch keine.</p> : null}
      <ul className="grid min-w-0 grid-cols-1 gap-3">
        {data.recordings.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <div className="min-w-0">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted">
                {clock(item.durationMs)} · {item.createdByName} · {formatWhen(item.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
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
    <Panel title="Sender jetzt">
      <p className="mb-4 text-sm text-muted">
        Übernimmt sofort. Geplante Fenster legt die Regie. Ein laufendes Fenster endet mit Überspringen in der Sendung.
      </p>
      {data.stations.length === 0 ? <p className="text-sm text-muted">Noch keine Sender.</p> : null}
      <ul className="grid min-w-0 grid-cols-1 gap-3">
        {data.stations.map((station) => (
          <li key={station.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <div>
              <p className="font-medium">{station.name}</p>
              <p className="text-sm text-muted">{station.note}</p>
            </div>
            <div className="flex gap-2">
              {[10, 30, 60].map((minutes) => (
                <Button
                  key={minutes}
                  variant="line"
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
      {data.slots.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {data.slots.slice(0, 6).map((slot) => (
            <li key={slot.id} className="text-sm text-muted">
              <span className="text-ink">{slot.title}</span>
              {" · "}
              {slot.stationName}
              {" · "}
              {formatWhen(slot.startsAt)}
              {slot.active ? " · aktiv" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

function Cue() {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Panel title="Andere Quelle">
      <p className="mb-3 text-sm text-muted">
        YouTube-Link wird offiziell eingebettet und läuft nur in den Browsern. Eine direkte Audiodatei (mp3, m4a, ogg,
        wav) geht auch an Sonos, sobald der Receiver steht. Ganze Titel ohne Abo sucht die Hörerschaft unter «Ganze
        Titel».
      </p>
      <form
        className="flex gap-2"
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
          placeholder="https://… oder YouTube-Link"
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
