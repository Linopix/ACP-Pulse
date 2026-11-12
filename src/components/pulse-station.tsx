/** Sendung: jetzt, Queue, Suche, Stimmen. Daten kommen aus getStation. */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MAX_OPEN_WISHES, isDesk, stationSeconds, syncNudge, type FilterMode } from "@/lib/pulse/logic";
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
import { ArtThumb, Button, Eq, Panel, Segment, errorText, fieldClass, formatWhen } from "@/components/pulse-ui";
import { GuidePanel } from "@/components/pulse-guide";
import { StudioChrome } from "@/components/pulse-nav";
import { useArea } from "@/components/pulse-area";
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
  const [hearing, setHearing] = useState(false);
  const area = useArea("sendung", hearing);
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
    <div className="flex min-h-screen w-full flex-col">
      <StudioChrome room="sendung" role={snap?.me.role ?? null} wide />
      <main className="pb-chrome mx-auto grid w-full min-w-0 grid-cols-1 items-start gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)] lg:gap-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,36rem)]">
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
            <div className="grid min-w-0 grid-cols-1 content-start gap-4 lg:col-start-1">
              <GuidePanel role={snap.me.role} name={snap.me.name} source={snap.musicSource} />
              <Banners snap={snap} />
              <NowPlaying snap={snap} now={now} area={area} onHearing={setHearing} onSkip={() => run(() => skipTrack(), setSnap)} />
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
            <div className="grid min-w-0 grid-cols-1 content-start gap-4 lg:col-start-2">
              <Search
                snap={snap}
                onAdded={setSnap}
                localWishes={area.beat ? area.beat.wishes : true}
                zoneName={area.beat?.zoneName ?? ""}
              />
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
  area,
  onHearing,
  onSkip,
}: {
  snap: StationSnapshot;
  now: number;
  area: ReturnType<typeof useArea>;
  onHearing: (hearing: boolean) => void;
  onSkip: () => void;
}) {
  const air = snap.now;
  const progress = air.startedAt
    ? Math.min(1, Math.max(0, (now - new Date(air.startedAt).getTime()) / Math.max(1, air.durationMs)))
    : 0;
  const audible = snap.outputTarget === "browser" || snap.monitorExternal;
  const listenVolume = area.beat?.volume ?? snap.volume;
  // Gruppe: zweites Gerät im selben Bereich online, dann zieht syncNudge früher nach.
  const grouped = area.beat?.syncTight === true;
  const player = useAir(air, audible, listenVolume, grouped);
  const heard = useRef("");

  useEffect(() => {
    onHearing(audible && !player.muted && !player.blocked);
  }, [audible, player.muted, player.blocked, onHearing]);

  useEffect(() => {
    const sample = player.sampleRef.current;
    const drift = sample.driftMs == null ? "—" : `${Math.round(sample.driftMs)} ms`;
    area.detailRef.current = [
      audible && !player.muted ? "Ton an" : "Ton aus",
      grouped ? "Gruppe" : "allein",
      player.blocked ? "wartet auf Klick" : sample.kind,
      `Rate ${sample.rate.toFixed(3)}`,
      `Drift ${drift}`,
      area.link,
    ].join(" · ");
  });

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
      <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <div className="w-30 max-w-30 shrink-0 overflow-hidden sm:w-44 sm:max-w-44">
        <Cover url={air.artworkUrl} title={air.title} live={air.mode !== "idle"} youtubeId={air.youtubeId} />
        </div>
        <div className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Eq live={air.mode !== "idle"} />
            <span className="rounded-md bg-surface-2 px-2 py-1">{air.via}</span>
            <span className="rounded-md bg-surface-2 px-2 py-1 text-subtle">{filters[snap.explicitFilter]}</span>
          </div>
          <div key={air.key} className="air-swap grid gap-1">
            <h1 className="line-clamp-2 font-display text-2xl leading-tight tracking-tight sm:text-4xl">{air.title}</h1>
            <p className="truncate text-muted">{air.subtitle}</p>
          </div>
          {air.mode === "announcement" && air.announcementBody ? (
            <p className="text-sm text-ink">{air.announcementBody}</p>
          ) : null}
          <div className="grid gap-1">
            <div className="air-meter" aria-hidden="true">
              <span className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs tabular-nums text-subtle">
              <span>{air.startedAt ? clock(Math.max(0, now - new Date(air.startedAt).getTime())) : "0:00"}</span>
              <span>{air.live ? "Live" : air.durationMs > 0 ? clock(air.durationMs) : ""}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm tabular-nums text-subtle">
              Lautstärke {listenVolume}
              {area.beat?.zoneName ? ` · ${area.beat.zoneName}` : ""}
            </span>
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
          {air.live ? <p className="text-xs text-subtle">Livestream des Senders, ohne Vorspulen.</p> : null}
          {!audible ? (
            <p className="text-xs text-subtle">Musik geht an {snap.outputLabel}. Dieser Bildschirm zeigt nur mit.</p>
          ) : null}
        </div>
      </div>
      <audio ref={player.audioRef} preload="auto" className="sr-only" />
      {audible && air.youtubeId ? (
        <HiddenYoutube
          youtubeId={air.youtubeId}
          startedAt={air.startedAt}
          live={air.live}
          volume={player.muted ? 0 : listenVolume}
          armed={player.ytArmed}
          sampleRef={player.sampleRef}
          grouped={grouped}
          onPlaying={player.heardYt}
          onNeedTap={player.needYt}
        />
      ) : null}
    </Panel>
  );
}

function Cover({ url, title, live, youtubeId }: { url: string; title: string; live: boolean; youtubeId?: string }) {
  const art = url || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : "");
  return (
    <div className="relative aspect-square w-full min-w-0 overflow-hidden rounded-md bg-surface-2">
      {art ? <img src={art} alt="" className="h-full max-h-full w-full max-w-full min-w-0 object-cover" /> : null}
      <div className={cn("absolute inset-0 grid place-items-center", art && "hidden")}>
        <span className="px-4 text-center font-display text-2xl text-muted">{live ? title : "Pulse"}</span>
      </div>
    </div>
  );
}

export function HiddenYoutube({
  youtubeId,
  startedAt,
  live,
  volume,
  armed,
  kick = 0,
  sampleRef,
  grouped = false,
  onPlaying,
  onNeedTap,
}: {
  youtubeId: string;
  startedAt: string | null;
  live: boolean;
  volume: number;
  armed: boolean;
  kick?: number;
  sampleRef?: { current: { driftMs: number | null; rate: number; kind: string } };
  grouped?: boolean;
  onPlaying: () => void;
  onNeedTap: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const startedRef = useRef(startedAt);
  const liveRef = useRef(live);
  const volumeRef = useRef(volume);
  const armedRef = useRef(armed);
  const playingRef = useRef(false);
  const soughtRef = useRef(0);
  const [src, setSrc] = useState("");
  startedRef.current = startedAt;
  liveRef.current = live;
  volumeRef.current = volume;
  armedRef.current = armed;

  useEffect(() => {
    playingRef.current = false;
    const elapsed = startedAt ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)) : 0;
    const next = new URL(`https://www.youtube.com/embed/${youtubeId}`);
    next.searchParams.set("enablejsapi", "1");
    next.searchParams.set("rel", "0");
    next.searchParams.set("modestbranding", "1");
    next.searchParams.set("playsinline", "1");
    next.searchParams.set("start", String(elapsed));
    next.searchParams.set("origin", window.location.origin);
    setSrc(next.toString());
  }, [youtubeId, startedAt]);

  useEffect(() => {
    postYt(frame.current, "setVolume", [volume]);
  }, [volume, src]);

  useEffect(() => {
    if (!src || (!armed && kick === 0)) return;
    postYt(frame.current, "setVolume", [volumeRef.current]);
    postYt(frame.current, "playVideo");
  }, [armed, src, kick]);

  useEffect(() => {
    if (!src) return;
    const timer = window.setTimeout(() => {
      if (!playingRef.current) onNeedTap();
    }, 1600);
    const onMessage = (event: MessageEvent) => {
      const fromFrame = event.source === frame.current?.contentWindow;
      const fromYt = typeof event.origin === "string" && event.origin.includes("youtube.com");
      if (!fromFrame && !fromYt) return;
      const info = ytClock(event.data);
      if (!info) return;
      if (info.playerState === 1) {
        playingRef.current = true;
        onPlaying();
      }
      if (info.currentTime == null) return;
      const target = stationSeconds(startedRef.current);
      if (target == null) return;
      const move = syncNudge(info.currentTime, target, {
        live: liveRef.current,
        fractionalRate: false,
        grouped,
      });
      if (sampleRef) {
        sampleRef.current = {
          driftMs: (info.currentTime - target) * 1000,
          rate: 1,
          kind: move.seekTo != null ? "video-seek" : "video",
        };
      }
      if (move.seekTo != null && Date.now() - soughtRef.current > 2500) {
        soughtRef.current = Date.now();
        postYt(frame.current, "seekTo", [move.seekTo, true]);
      }
    };
    window.addEventListener("message", onMessage);
    const poll = window.setInterval(() => postYt(frame.current, "getCurrentTime"), 1000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener("message", onMessage);
    };
  }, [src, onNeedTap, onPlaying, sampleRef, grouped]);

  if (!src) return null;
  return (
    <iframe
      ref={frame}
      id="pulse-yt"
      title="Sendungston"
      src={src}
      allow="autoplay; encrypted-media"
      tabIndex={-1}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 h-[270px] w-[480px] opacity-0"
      style={{ left: "-100vw" }}
      onLoad={() => {
        postYt(frame.current, "setVolume", [volumeRef.current]);
        const target = stationSeconds(startedRef.current);
        if (target != null && target > 0.35 && !liveRef.current) postYt(frame.current, "seekTo", [target, true]);
        postYt(frame.current, "playVideo");
      }}
    />
  );
}

function ytClock(data: unknown): { currentTime: number | null; playerState?: number } | null {
  let value = data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const info = rec.info;
  if (!info || typeof info !== "object") return null;
  const row = info as Record<string, unknown>;
  return {
    currentTime: typeof row.currentTime === "number" ? row.currentTime : null,
    playerState: typeof row.playerState === "number" ? row.playerState : undefined,
  };
}

function postYt(frame: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  const win = frame?.contentWindow;
  if (!win) return;
  win.postMessage(JSON.stringify({ event: "listening", id: "pulse-yt", channel: "widget" }), "*");
  win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
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
        <p className="rounded-lg bg-surface-2 px-4 py-6 text-sm text-muted">
          Keine Wünsche. Es läuft {snap.fallbackName}.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">Sortiert nach Zustimmung.</p>
          {snap.wishPrune === "auto" ? (
            <p className="mb-4 text-xs text-subtle">
              Ab {snap.wishPruneAt} Wünschen fallen Titel ohne Upvote oder mit mehr Gegenstimmen weg.
            </p>
          ) : null}
          <ul className="grid min-w-0 grid-cols-1 gap-2">
            {snap.queue.map((item) => (
              <QueueRow key={item.id} item={item} snap={snap} onChange={onChange} />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function QueueRow({
  item,
  snap,
  onChange,
}: {
  item: QueueItem;
  snap: StationSnapshot;
  onChange: (snap: StationSnapshot) => void;
}) {
  const upFull = snap.budget.upUsed >= snap.budget.up && item.myVote !== 1;
  const downFull = snap.budget.downUsed >= snap.budget.down && item.myVote !== -1;
  const upLocked = item.mine || (upFull && item.myVote !== 1);
  const downLocked = item.mine || (downFull && item.myVote !== -1);
  return (
    <li className={cn("flex min-w-0 flex-wrap items-center gap-3 rounded-lg bg-surface-2 px-3 py-2", item.blocked && "opacity-70")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ArtThumb url={item.artworkUrl} title={item.title} />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{item.title}</p>
          <p className="truncate text-sm text-muted">
            {item.artist}
            <span> · {item.mine ? "dein Wunsch" : item.addedByName}</span>
            {item.blocked ? " · Filter hält ihn zurück" : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <VoteButton
          label="Hoch"
          pressed={item.myVote === 1}
          disabled={upLocked}
          hint={item.mine ? "Eigene Wünsche stimmt man nicht ab." : upFull ? "Hoch-Kontingent ist aufgebraucht." : "Hoch"}
          onClick={() => void vote(item, item.myVote === 1 ? 0 : 1, onChange)}
        />
        <span
          className={cn(
            "grid h-11 w-10 place-items-center rounded-md text-sm font-medium tabular-nums",
            item.myVote === 1 ? "bg-signal text-signal-ink" : "bg-canvas text-muted",
          )}
        >
          {item.score}
        </span>
        <VoteButton
          label="Runter"
          pressed={item.myVote === -1}
          disabled={downLocked}
          hint={item.mine ? "Eigene Wünsche stimmt man nicht ab." : downFull ? "Runter-Kontingent ist aufgebraucht." : "Runter"}
          onClick={() => void vote(item, item.myVote === -1 ? 0 : -1, onChange)}
        />
        {item.mine || isDesk(snap.me.role) ? (
          <Button variant="ghost" className="px-2 text-danger" onClick={() => void run(() => withdrawWish({ data: { id: item.id } }), onChange)}>
            Weg
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function VoteButton({
  label,
  pressed,
  disabled,
  hint,
  onClick,
}: {
  label: string;
  pressed: boolean;
  disabled: boolean;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={hint}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "vote h-11 w-11 rounded-md text-base font-medium disabled:opacity-30",
        pressed ? "bg-signal text-signal-ink" : "text-muted hover:bg-surface hover:text-ink",
      )}
    >
      {label === "Hoch" ? "↑" : "↓"}
    </button>
  );
}

function Search({
  snap,
  onAdded,
  localWishes,
  zoneName,
}: {
  snap: StationSnapshot;
  onAdded: (snap: StationSnapshot) => void;
  localWishes: boolean;
  zoneName: string;
}) {
  const desk = isDesk(snap.me.role);
  const [picked, setPicked] = useState<"preview" | "archive" | "youtube" | "spotify">(
    snap.musicSource === "youtube" ? "youtube" : snap.musicSource === "spotify" ? "spotify" : snap.musicSource === "archive" ? "archive" : "preview",
  );
  const catalog = desk ? picked : snap.musicSource;
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<TrackInput[]>([]);
  const [pending, setPending] = useState(false);
  const [looked, setLooked] = useState(false);

  useEffect(() => {
    if (desk) return;
    setHits([]);
    setLooked(false);
  }, [desk, snap.musicSource]);

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

  const closed = !snap.wishesEnabled || !localWishes;
  const sourceLabel =
    catalog === "youtube" ? "YouTube" : catalog === "spotify" ? "Spotify" : catalog === "archive" ? "Ganze Titel" : "30-Sekunden-Vorschau";
  return (
    <Panel title="Wunsch">
      <p className="mb-3 text-sm text-muted">
        {snap.openWishes}/{MAX_OPEN_WISHES} offene Wünsche von dir.
      </p>
      {desk ? (
        <div className="mb-3">
          <Segment
            label="Musikquelle"
            value={catalog}
            onChange={setPicked}
            options={[
              { id: "preview", label: "30s Vorschau" },
              { id: "archive", label: "Ganze Titel" },
              ...(snap.youtubeOn ? [{ id: "youtube" as const, label: "YouTube" }] : []),
              ...(snap.spotifyOn ? [{ id: "spotify" as const, label: "Spotify" }] : []),
            ]}
          />
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted">
          Quelle <span className="font-medium text-ink">{sourceLabel}</span>
        </p>
      )}
      {catalog === "spotify" && desk ? (
        <p className="mb-3 text-xs text-subtle">
          {snap.spotifyAccount
            ? `Suche über ${snap.spotifyAccount}. Alle Bildschirme spielen denselben Ton.`
            : "Dieselbe Datei in jedem Browser, leise im Takt gehalten. Das eigene Konto verbindet die Regie einmal."}
        </p>
      ) : null}
      {!snap.wishesEnabled ? (
        <p className="mb-3 text-sm text-ink">Wünsche sind gerade geschlossen.</p>
      ) : !localWishes ? (
        <p className="mb-3 text-sm text-ink">
          In {zoneName || "diesem Bereich"} sind Wünsche gerade zu. Die Sendung läuft weiter.
        </p>
      ) : null}
      <form className="flex gap-2" onSubmit={(event) => void onSearch(event)}>
        <input
          className={cn(fieldClass, "min-w-0 flex-1")}
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
      <ul className="mt-3 grid max-h-80 min-w-0 gap-2 overflow-y-auto overscroll-contain">
        {hits.map((hit) => (
          <li key={`${hit.externalId}-${hit.title}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-2 p-2">
            <ArtThumb url={hit.artworkUrl} title={hit.title} />
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

export function useAir(air: StationSnapshot["now"], audible: boolean, volume: number, grouped = false) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sig = useRef("");
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [ytArmed, setYtArmed] = useState(false);
  const armedRef = useRef(false);
  const soughtRef = useRef(0);
  const sampleRef = useRef({ driftMs: null as number | null, rate: 1, kind: "still" });
  const heardYt = useCallback(() => {
    armedRef.current = true;
    setYtArmed(true);
    setBlocked(false);
  }, []);
  const needYt = useCallback(() => {
    if (!armedRef.current) setBlocked(true);
  }, []);

  const start = useCallback(async () => {
    void cue("ident");
    const audio = audioRef.current;
    armedRef.current = true;
    setYtArmed(true);
    setBlocked(false);
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
      audio.playbackRate = 1;
      sampleRef.current = { driftMs: null, rate: 1, kind: "video" };
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
    audio.playbackRate = 1;
    void audio
      .play()
      .then(() => {
        seek(audio, air.startedAt, air.live);
        setBlocked(false);
      })
      .catch(() => setBlocked(true));
  }, [air, audible, muted]);

  useEffect(() => {
    if (air.youtubeId || air.live || !audible || muted) return;
    const id = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio.paused || !Number.isFinite(audio.currentTime)) {
        sampleRef.current = { driftMs: null, rate: 1, kind: "still" };
        return;
      }
      const target = stationSeconds(air.startedAt);
      if (target == null) return;
      const driftMs = (audio.currentTime - target) * 1000;
      if (Number.isFinite(audio.duration) && target > audio.duration - 0.25) {
        audio.playbackRate = 1;
        sampleRef.current = { driftMs, rate: 1, kind: "audio" };
        return;
      }
      const move = syncNudge(audio.currentTime, target, { grouped });
      if (move.seekTo != null) {
        if (Date.now() - soughtRef.current < 2500) {
          sampleRef.current = { driftMs, rate: audio.playbackRate, kind: "audio" };
          return;
        }
        soughtRef.current = Date.now();
        audio.currentTime = move.seekTo;
        audio.playbackRate = 1;
        sampleRef.current = { driftMs: 0, rate: 1, kind: "audio" };
        return;
      }
      if (Math.abs(audio.playbackRate - move.rate) > 0.0005) audio.playbackRate = move.rate;
      sampleRef.current = { driftMs, rate: move.rate, kind: "audio" };
    }, 1000);
    return () => {
      window.clearInterval(id);
      const audio = audioRef.current;
      if (audio) audio.playbackRate = 1;
    };
  }, [air.youtubeId, air.live, air.startedAt, audible, muted, grouped]);

  return { audioRef, blocked, muted, setMuted, start, ytArmed, heardYt, needYt, sampleRef };
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
