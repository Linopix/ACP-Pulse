/** Sendung: jetzt, Queue, Suche, Stimmen. Daten kommen aus getStation. */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MAX_OPEN_WISHES, isDesk, type FilterMode } from "@/lib/pulse/logic";
import {
  addWish,
  castVote,
  getClip,
  getStation,
  postAnnouncement,
  searchMusic,
  skipTrack,
  withdrawWish,
} from "@/lib/pulse/api";
import type { QueueItem, StationSnapshot, TrackInput } from "@/lib/pulse/types";
import { Button, Eq, Panel, errorText, fieldClass, formatWhen } from "@/components/pulse-ui";
import { GuidePanel } from "@/components/pulse-guide";
import { StudioChrome } from "@/components/pulse-nav";
import { speakPiper } from "@/lib/pulse/voice";
import { cue } from "@/lib/pulse/cues";
import { cn } from "@/lib/utils";

const filters: Record<FilterMode, string> = {
  allow: "Alles erlaubt",
  clean: "Ohne Explicit",
  strict: "Strenger Filter",
};

export function Station() {
  const [snap, setSnap] = useState<StationSnapshot | null>(null);
  const [failed, setFailed] = useState("");
  const now = useClock();

  const refresh = useCallback(async () => {
    try {
      const next = await getStation();
      setSnap(next);
      setFailed("");
    } catch (error) {
      setFailed(errorText(error));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className="flex min-h-screen w-full flex-col pb-safe">
      <StudioChrome room="sendung" role={snap?.me.role ?? null} wide />
      <main className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 gap-4 px-4 py-6 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {!snap && !failed ? <p className="text-muted">Sendung wird geladen.</p> : null}
        {failed && !snap ? (
          <Panel title="Keine Verbindung">
            <p className="text-sm text-muted">{failed}</p>
            <Button className="mt-4" onClick={() => void refresh()}>
              Nochmal
            </Button>
          </Panel>
        ) : null}
        {snap ? (
          <>
            <div className="grid min-w-0 grid-cols-1 content-start gap-4">
              <GuidePanel role={snap.me.role} />
              <Banners snap={snap} />
              <NowPlaying snap={snap} now={now} onSkip={() => run(() => skipTrack(), setSnap)} />
              <Queue snap={snap} onChange={setSnap} />
              {snap.history.length > 0 ? (
                <Panel title="Zuletzt">
                  <ul className="grid min-w-0 grid-cols-1 gap-2">
                    {snap.history.map((item) => (
                      <li key={`${item.at}-${item.title}`} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-ink">
                          {item.title}
                          <span className="text-muted"> · {item.artist}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-subtle">{formatWhen(item.at)}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
            </div>
            <div className="grid min-w-0 grid-cols-1 content-start gap-4">
              <Search snap={snap} onAdded={setSnap} />
              {isDesk(snap.me.role) ? <Announce onAir={setSnap} /> : null}
              <p className="px-1 text-xs text-subtle">Ausgabe: {snap.outputLabel}.</p>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Banners({ snap }: { snap: StationSnapshot }) {
  if (!snap.activeRule && snap.wishesEnabled && !snap.relay) return null;
  return (
    <div className="grid gap-2">
      {snap.activeRule ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          <span className="font-medium text-ink">{snap.activeRule.title}</span>
          {" bis "}
          {formatWhen(snap.activeRule.endsAt)}
          {snap.activeRule.note ? ` · ${snap.activeRule.note}` : ""}
        </p>
      ) : null}
      {!snap.wishesEnabled ? (
        <p className="rounded-lg border border-line px-4 py-3 text-sm text-ink">Wünsche sind gerade geschlossen.</p>
      ) : null}
      {snap.relay && snap.now.mode !== "relay" ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          <span className="font-medium text-ink">{snap.relay.stationName}</span>
          {" bis "}
          {formatWhen(snap.relay.endsAt)}
          {snap.now.mode === "announcement" ? " · danach wieder der Sender" : ""}
        </p>
      ) : null}
    </div>
  );
}

function NowPlaying({
  snap,
  now,
  onSkip,
}: {
  snap: StationSnapshot;
  now: number;
  onSkip: () => void;
}) {
  const air = snap.now;
  const progress = air.startedAt
    ? Math.min(1, Math.max(0, (now - new Date(air.startedAt).getTime()) / Math.max(1, air.durationMs)))
    : 0;
  const audible = snap.outputTarget === "browser" || snap.monitorExternal;
  const player = useAir(air, audible, snap.volume);
  const heard = useRef("");

  useEffect(() => {
    if (!audible || player.muted) return;
    if (heard.current === air.key) return;
    const first = heard.current === "";
    heard.current = air.key;
    if (first) return;
    void cue(air.mode === "announcement" ? "announce" : "air");
  }, [air.key, air.mode, audible, player.muted]);

  return (
    <Panel>
      <div className="grid w-full min-w-0 grid-cols-1 gap-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
        <Cover url={air.artworkUrl} title={air.title} live={air.mode !== "idle"} youtubeId={air.youtubeId} startAt={air.startedAt} armed={player.ytArmed} />
        <div className="grid min-w-0 gap-3">
          <div className="flex items-center gap-3 text-sm text-muted">
            <Eq live={air.mode !== "idle"} />
            <span>{air.via}</span>
            <span className="text-subtle">{filters[snap.explicitFilter]}</span>
          </div>
          <div key={air.key} className="air-swap grid gap-1">
            <h1 className="truncate font-display text-4xl leading-none tracking-tight">{air.title}</h1>
            <p className="truncate text-muted">{air.subtitle}</p>
          </div>
          {air.mode === "announcement" && air.announcementBody ? (
            <p className="text-sm text-ink">{air.announcementBody}</p>
          ) : null}
          <div className="h-1 overflow-hidden rounded-sm bg-surface-2">
            <div className="progress-fill h-full bg-signal" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm tabular-nums text-subtle">Lautstärke {snap.volume}</span>
            <Button
              variant="line"
              onClick={() => {
                player.setMuted((value) => {
                  if (value) void cue("ident");
                  return !value;
                });
              }}
            >
              {player.muted ? "Ton an" : "Leise hier"}
            </Button>
            {player.blocked && audible ? (
              <Button onClick={() => void player.start()}>Sendung hören</Button>
            ) : null}
            {isDesk(snap.me.role) && air.mode !== "idle" ? (
              <Button variant="ghost" onClick={onSkip}>
                Überspringen
              </Button>
            ) : null}
          </div>
          {air.youtubeId ? (
            <p className="text-xs text-subtle">YouTube spielt hier und auf der Receiver-Seite, nicht auf Sonos.</p>
          ) : null}
          {air.live ? <p className="text-xs text-subtle">Livestream des Senders, ohne Vorspulen.</p> : null}
          {!audible ? (
            <p className="text-xs text-subtle">Musik geht an {snap.outputLabel}. Dieser Bildschirm zeigt nur mit.</p>
          ) : null}
        </div>
      </div>
      <audio ref={player.audioRef} preload="auto" className="sr-only" />
    </Panel>
  );
}

function Cover({
  url,
  title,
  live,
  youtubeId,
  startAt,
  armed,
}: {
  url: string;
  title: string;
  live: boolean;
  youtubeId?: string;
  startAt?: string | null;
  armed?: boolean;
}) {
  const start = startAt ? Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 1000)) : 0;
  return (
    <div className="relative aspect-square w-full min-w-0 max-w-full overflow-hidden rounded-md bg-surface-2">
      {youtubeId ? (
        <iframe
          key={`${youtubeId}-${armed ? "on" : "off"}`}
          title={title}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&start=${start}${armed ? "&autoplay=1" : ""}`}
          allow="autoplay; encrypted-media"
          className="h-full max-h-full w-full max-w-full"
        />
      ) : null}
      {url && !youtubeId ? <img src={url} alt="" className="h-full max-h-full w-full max-w-full min-w-0 object-cover" /> : null}
      <div className={cn("absolute inset-0 grid place-items-center", (url || youtubeId) && "hidden")}>
        {!url && !youtubeId ? (
          <span className="px-4 text-center font-display text-2xl text-muted">{live ? title : "Pulse"}</span>
        ) : null}
      </div>
    </div>
  );
}

function Queue({ snap, onChange }: { snap: StationSnapshot; onChange: (snap: StationSnapshot) => void }) {
  const { budget } = snap;
  return (
    <Panel
      title="Queue"
      action={
        <span className="text-xs tabular-nums text-subtle">
          {budget.upUsed}/{budget.up} hoch · {budget.downUsed}/{budget.down} runter
        </span>
      }
    >
      {snap.queue.length === 0 ? (
        <p className="text-sm text-muted">Keine Wünsche. Es läuft {snap.fallbackName}.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">Sortiert nach Zustimmung.</p>
          {snap.wishPrune === "auto" ? (
            <p className="mb-4 text-xs text-subtle">
              Ab {snap.wishPruneAt} Wünschen fallen Titel ohne Upvote oder mit mehr Gegenstimmen weg.
            </p>
          ) : null}
          <ul className="grid min-w-0 grid-cols-1 gap-2">
            {snap.queue.map((item, index) => (
              <QueueRow key={item.id} item={item} index={index} snap={snap} onChange={onChange} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function QueueRow({
  item,
  index,
  snap,
  onChange,
}: {
  item: QueueItem;
  index: number;
  snap: StationSnapshot;
  onChange: (snap: StationSnapshot) => void;
}) {
  const upFull = snap.budget.upUsed >= snap.budget.up && item.myVote !== 1;
  const downFull = snap.budget.downUsed >= snap.budget.down && item.myVote !== -1;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-surface-2 p-2 sm:p-3">
      <span className="w-6 text-center text-sm tabular-nums text-subtle">{index + 1}</span>
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{item.title}</p>
        <p className="truncate text-sm text-muted">
          {item.artist} · {item.mine ? "dein Wunsch" : item.addedByName}
          {item.blocked ? " · Filter hält ihn zurück" : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <VoteButton
          label="Hoch"
          pressed={item.myVote === 1}
          disabled={item.mine || (upFull && item.myVote !== 1)}
          onClick={() => void vote(item, item.myVote === 1 ? 0 : 1, onChange)}
        />
        <span className="w-8 text-center text-sm tabular-nums text-ink">{item.score}</span>
        <VoteButton
          label="Runter"
          pressed={item.myVote === -1}
          disabled={item.mine || (downFull && item.myVote !== -1)}
          onClick={() => void vote(item, item.myVote === -1 ? 0 : -1, onChange)}
        />
        {item.mine || isDesk(snap.me.role) ? (
          <button
            type="button"
            className="h-11 px-2 text-xs text-subtle"
            onClick={() => void run(() => withdrawWish({ data: { id: item.id } }), onChange)}
          >
            Weg
          </button>
        ) : null}
      </div>
    </li>
  );
}

function VoteButton({
  label,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "vote h-11 w-11 rounded-md text-sm font-medium disabled:opacity-30",
        pressed ? "bg-signal text-signal-ink" : "bg-canvas text-muted",
      )}
    >
      {label === "Hoch" ? "↑" : "↓"}
    </button>
  );
}

function Search({ snap, onAdded }: { snap: StationSnapshot; onAdded: (snap: StationSnapshot) => void }) {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<"preview" | "archive" | "youtube" | "spotify">(
    snap.musicSource === "youtube" ? "youtube" : snap.musicSource === "spotify" ? "spotify" : snap.musicSource === "archive" ? "archive" : "preview",
  );
  const [hits, setHits] = useState<TrackInput[]>([]);
  const [pending, setPending] = useState(false);
  const [looked, setLooked] = useState(false);

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      setHits(await searchMusic({ data: { query, catalog } }));
      setLooked(true);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setPending(false);
    }
  }

  const closed = !snap.wishesEnabled;
  return (
    <Panel title="Wunsch">
      <p className="mb-3 text-sm text-muted">
        {snap.openWishes}/{MAX_OPEN_WISHES} offene Wünsche von dir.
      </p>
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {(
          [
            ["preview", "30s Vorschau"],
            ["archive", "Ganze Titel"],
            ...(snap.youtubeOn ? ([["youtube", "YouTube"]] as const) : []),
            ...(snap.spotifyOn ? ([["spotify", "Spotify"]] as const) : []),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setCatalog(id)}
            className={cn(
              "h-11 shrink-0 rounded-md px-3 text-sm",
              catalog === id ? "bg-signal text-signal-ink" : "bg-surface-2 text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(event) => void onSearch(event)}>
        <input
          className={fieldClass}
          value={query}
          placeholder={
            catalog === "archive"
              ? "Titel aus dem Archiv, ohne Abo"
              : catalog === "youtube"
                ? "Song, Interpret oder YouTube-Link"
                : catalog === "spotify"
                  ? "Song oder Interpret auf Spotify"
                  : "Song oder Interpret"
          }
          onChange={(event) => setQuery(event.target.value)}
          disabled={closed}
        />
        <Button type="submit" disabled={closed || pending || query.trim().length < 2}>
          {pending ? "…" : "Suchen"}
        </Button>
      </form>
      <ul className="mt-3 grid gap-2">
        {hits.map((hit) => (
          <li key={`${hit.externalId}-${hit.title}`} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{hit.title}</p>
              <p className="truncate text-xs text-muted">
                {hit.artist}
                {hit.durationMs > 35_000 ? ` · ${clock(hit.durationMs)}` : ""}
                {hit.explicit ? " · explicit" : ""}
              </p>
            </div>
            <Button
              variant="line"
              disabled={closed}
              onClick={() =>
                void run(() => addWish({ data: hit }), onAdded, "In der Queue.").then((ok) => {
                  if (ok) void cue("wish");
                })
              }
            >
              Dazu
            </Button>
          </li>
        ))}
      </ul>
      {looked && hits.length === 0 ? <p className="mt-3 text-sm text-muted">Nichts gefunden. Anderer Suchbegriff.</p> : null}
    </Panel>
  );
}

function Announce({ onAir }: { onAir: (snap: StationSnapshot) => void }) {
  const [title, setTitle] = useState("Durchsage");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Panel title="Durchsage">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void run(() => postAnnouncement({ data: { title, body } }), onAir, "Durchsage läuft.").finally(() => {
            setPending(false);
            setBody("");
          });
        }}
      >
        <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
        <textarea
          className="min-h-24 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          placeholder="Kurzer Text, der die Musik unterbricht."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button type="submit" disabled={pending || body.trim().length < 8}>
          Jetzt sprechen
        </Button>
      </form>
    </Panel>
  );
}

function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function useAir(
  air: StationSnapshot["now"],
  audible: boolean,
  volume: number,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sig = useRef("");
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [ytArmed, setYtArmed] = useState(false);

  const start = useCallback(async () => {
    void cue("ident");
    const audio = audioRef.current;
    setBlocked(false);
    setYtArmed(true);
    if (air.youtubeId) return;
    if (air.mode === "announcement" && air.recordingId) {
      await playClip(air.recordingId, audio, setBlocked);
      return;
    }
    if (air.mode === "announcement" && air.announcementBody && audible && !muted) {
      speakPiper(air.announcementBody, air.voiceId || "de_DE-kerstin-low");
    }
    if (!audio || !air.audioUrl || !audible || air.mode === "announcement") return;
    try {
      await audio.play();
      seek(audio, air.startedAt, air.live);
    } catch {
      setBlocked(true);
    }
  }, [air, audible, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : Math.min(1, Math.max(0, volume / 100));
  }, [muted, volume, air.key]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = `${air.key}|${audible}|${muted}`;
    if (sig.current === next) return;
    sig.current = next;
    window.speechSynthesis?.cancel();
    if (air.youtubeId) {
      audio.pause();
      setBlocked(true);
      setYtArmed(false);
      return;
    }
    if (!audible || muted) {
      audio.pause();
      return;
    }
    if (air.mode === "announcement" && air.recordingId) {
      void playClip(air.recordingId, audio, setBlocked);
      return;
    }
    if (air.mode === "announcement") {
      audio.pause();
      if (air.announcementBody) speakPiper(air.announcementBody, air.voiceId || "de_DE-kerstin-low");
      return;
    }
    if (!air.audioUrl) {
      audio.pause();
      return;
    }
    audio.src = air.audioUrl;
    void audio
      .play()
      .then(() => {
        seek(audio, air.startedAt, air.live);
        setBlocked(false);
      })
      .catch(() => setBlocked(true));
  }, [air, audible, muted]);

  return { audioRef, blocked, muted, setMuted, start, ytArmed };
}

function seek(audio: HTMLAudioElement, startedAt: string | null, live: boolean) {
  if (live || !startedAt) return;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  if (Number.isFinite(audio.duration) && elapsed > 0 && elapsed < audio.duration) {
    audio.currentTime = elapsed;
  }
}

async function playClip(
  id: number,
  audio: HTMLAudioElement | null,
  setBlocked: (value: boolean) => void,
) {
  if (!audio) return;
  try {
    const clip = await getClip({ data: { id } });
    audio.src = `data:${clip.mime};base64,${clip.audioBase64}`;
    await audio.play();
    setBlocked(false);
  } catch {
    setBlocked(true);
  }
}

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

async function vote(item: QueueItem, value: -1 | 0 | 1, onChange: (snap: StationSnapshot) => void) {
  const ok = await run(() => castVote({ data: { id: item.id, value } }), onChange);
  if (ok && value !== 0) void cue("tick");
}

async function run(
  action: () => Promise<StationSnapshot>,
  onChange: (snap: StationSnapshot) => void,
  ok?: string,
): Promise<boolean> {
  try {
    onChange(await action());
    if (ok) toast.success(ok);
    return true;
  } catch (error) {
    toast.error(errorText(error));
    return false;
  }
}
