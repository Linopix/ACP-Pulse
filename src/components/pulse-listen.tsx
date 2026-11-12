/** Ton auf Pult und Regie. Unabhängig davon, wohin die Sendung sonst ausgegeben wird. */
import { useEffect, useState } from "react";
import { getStation } from "@/lib/pulse/api";
import type { PlaybackView } from "@/lib/pulse/types";
import { useArea } from "@/components/pulse-area";
import { HiddenYoutube, useAir } from "@/components/pulse-station";
import { Button } from "@/components/pulse-ui";

export function RoomListen({
  room,
  air,
  fallbackVolume = 42,
}: {
  room: "pult" | "regie";
  air?: PlaybackView | null;
  fallbackVolume?: number;
}) {
  const [own, setOwn] = useState<PlaybackView | null>(null);
  const [ownVolume, setOwnVolume] = useState(fallbackVolume);
  const [armed, setArmed] = useState(false);
  const [listen, setListen] = useState(false);
  const [kick, setKick] = useState(0);
  const playing = air ?? own;
  const area = useArea(room, listen);
  const volume = area.beat?.volume ?? (air ? fallbackVolume : ownVolume);
  // Dieselbe Gruppenregel wie in der Sendung: nur mit einem zweiten Gerät im Bereich.
  const grouped = area.beat?.syncTight === true;
  const player = useAir(
    playing ?? {
      mode: "idle",
      key: "idle",
      title: "",
      subtitle: "",
      artworkUrl: "",
      audioUrl: "",
      startedAt: null,
      durationMs: 0,
      announcementBody: "",
      via: "",
      explicit: false,
      live: false,
      youtubeId: "",
      recordingId: null,
      voiceId: "",
    },
    listen && Boolean(playing),
    volume,
    grouped,
  );

  useEffect(() => {
    setListen(armed && !player.muted && !player.blocked);
  }, [armed, player.muted, player.blocked]);

  useEffect(() => {
    if (air) return;
    let stop = false;
    const load = () => {
      void getStation()
        .then((snap) => {
          if (stop) return;
          setOwn(snap.now);
          setOwnVolume(snap.volume);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [air]);

  useEffect(() => {
    const sample = player.sampleRef.current;
    const drift = sample.driftMs == null ? "—" : `${Math.round(sample.driftMs)} ms`;
    area.detailRef.current = [
      armed && !player.muted ? "Ton an" : "Ton aus",
      grouped ? "Gruppe" : "allein",
      player.blocked ? "wartet auf Klick" : sample.kind,
      `Rate ${sample.rate.toFixed(3)}`,
      `Drift ${drift}`,
      area.link,
    ].join(" · ");
  });

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        variant={!armed || player.muted ? "primary" : "line"}
        onClick={() => {
          setKick((value) => value + 1);
          if (!armed || player.muted) {
            setArmed(true);
            player.setMuted(false);
            void player.start();
            return;
          }
          player.setMuted(true);
        }}
      >
        {!armed || player.muted ? "Ton an" : "Leise hier"}
      </Button>
      {armed && player.blocked ? (
        <Button
          onClick={() => {
            setKick((value) => value + 1);
            void player.start();
          }}
        >
          Sendung hören
        </Button>
      ) : null}
      <span className="text-sm tabular-nums text-subtle">
        Lautstärke {volume}
        {area.beat?.zoneName ? ` · ${area.beat.zoneName}` : ""}
        {area.beat?.deviceName ? ` · ${area.beat.deviceName}` : ""}
      </span>
      <audio ref={player.audioRef} preload="auto" className="sr-only" />
      {armed && playing?.youtubeId ? (
        <HiddenYoutube
          youtubeId={playing.youtubeId}
          startedAt={playing.startedAt}
          live={playing.live}
          volume={player.muted ? 0 : volume}
          armed={player.ytArmed}
          kick={kick}
          sampleRef={player.sampleRef}
          grouped={grouped}
          onPlaying={player.heardYt}
          onNeedTap={player.needYt}
        />
      ) : null}
    </div>
  );
}
