/** Bereiche und Debug in der Regie. */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteZone, getAreas, saveDevice, saveZone } from "@/lib/pulse/api";
import type { AreaSnapshot, AudioDevice, AudioZone } from "@/lib/pulse/types";
import { deviceId } from "@/components/pulse-area";
import { Button, Field, Panel, errorText, fieldClass, formatWhen } from "@/components/pulse-ui";

const rooms: Record<string, string> = { sendung: "Sendung", pult: "Pult", regie: "Regie" };

export function AreasDesk() {
  const [data, setData] = useState<AreaSnapshot | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [volume, setVolume] = useState(36);

  async function load() {
    try {
      setData(await getAreas());
      setError("");
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  const loose = data?.devices.filter((device) => device.zoneId == null) ?? [];

  return (
    <div className="grid gap-4">
      <Panel title="Audiobereiche">
        <p className="mb-4 text-sm text-muted">
          Jeder offene Bildschirm meldet sich. Ein Bereich hat eine eigene Lautstärke. Ohne Bereich gilt die Lautstärke der
          Sendung.
        </p>
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        <form
          className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void saveZone({ data: { name, volume } })
              .then((next) => {
                setData(next);
                setName("");
                toast.success("Bereich angelegt.");
              })
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          <Field label="Neuer Bereich">
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Küche" />
          </Field>
          <Field label={`Lautstärke ${volume}`}>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </Field>
          <Button type="submit" disabled={name.trim().length < 2}>
            Anlegen
          </Button>
        </form>
        {!data ? <p className="text-sm text-muted">Bereiche werden geladen.</p> : null}
        <div className="grid gap-3">
          {data?.zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              devices={data.devices.filter((device) => device.zoneId === zone.id)}
              zones={data.zones}
              onChange={setData}
            />
          ))}
        </div>
      </Panel>
      <Panel title="Ohne Bereich">
        {loose.length === 0 ? (
          <p className="text-sm text-muted">Keine losen Geräte. Offene Bildschirme erscheinen von selbst.</p>
        ) : (
          <ul className="grid gap-2">
            {loose.map((device) => (
              <DeviceRow key={device.id} device={device} zones={data?.zones ?? []} onChange={setData} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ZoneCard({
  zone,
  devices,
  zones,
  onChange,
}: {
  zone: AudioZone;
  devices: AudioDevice[];
  zones: AudioZone[];
  onChange: (next: AreaSnapshot) => void;
}) {
  const [name, setName] = useState(zone.name);
  const [volume, setVolume] = useState(zone.volume);
  const focus = useRef(false);
  const drag = useRef(false);
  const nameRef = useRef(zone.name);
  const volumeRef = useRef(zone.volume);
  const timer = useRef(0);
  nameRef.current = name;
  volumeRef.current = volume;

  useEffect(() => {
    if (!focus.current) setName(zone.name);
  }, [zone.name]);
  useEffect(() => {
    if (!drag.current) setVolume(zone.volume);
  }, [zone.volume]);

  function commit(nextName: string, nextVolume: number) {
    drag.current = true;
    void saveZone({ data: { id: zone.id, name: nextName, volume: nextVolume } })
      .then((next) => {
        drag.current = false;
        onChange(next);
      })
      .catch((caught) => {
        drag.current = false;
        toast.error(errorText(caught));
      });
  }

  return (
    <section className="grid gap-3 rounded-lg bg-surface-2 p-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
        <Field label="Name">
          <input
            className={fieldClass}
            value={name}
            onFocus={() => {
              focus.current = true;
            }}
            onBlur={() => {
              focus.current = false;
              if (name.trim() !== zone.name) commit(name, volume);
            }}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label={`Lautstärke ${volume}`}>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onPointerDown={() => {
              drag.current = true;
            }}
            onChange={(event) => {
              const next = Number(event.target.value);
              volumeRef.current = next;
              setVolume(next);
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => commit(nameRef.current, next), 400);
            }}
            onPointerUp={() => {
              window.clearTimeout(timer.current);
              commit(nameRef.current, volumeRef.current);
            }}
          />
        </Field>
        <Button
          variant="ghost"
          className="text-danger"
          onClick={() => {
            void deleteZone({ data: { id: zone.id } })
              .then(onChange)
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          Löschen
        </Button>
      </div>
      {devices.length === 0 ? (
        <p className="text-sm text-muted">Noch kein Gerät in diesem Bereich.</p>
      ) : (
        <ul className="grid gap-2">
          {devices.map((device) => (
            <DeviceRow key={device.id} device={device} zones={zones} onChange={onChange} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeviceRow({
  device,
  zones,
  onChange,
}: {
  device: AudioDevice;
  zones: AudioZone[];
  onChange: (next: AreaSnapshot) => void;
}) {
  const [name, setName] = useState(device.name);
  const focus = useRef(false);
  const [self, setSelf] = useState(false);

  useEffect(() => {
    setSelf(device.id === deviceId());
  }, [device.id]);

  useEffect(() => {
    if (!focus.current) setName(device.name);
  }, [device.name]);

  function commit(nextName: string, zoneId: number | null) {
    void saveDevice({ data: { id: device.id, name: nextName, zoneId } })
      .then(onChange)
      .catch((caught) => toast.error(errorText(caught)));
  }

  return (
    <li className="grid min-w-0 gap-2 rounded-md bg-canvas px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-subtle">
        <span className={device.online ? "h-2 w-2 rounded-full bg-signal" : "h-2 w-2 rounded-full bg-line"} />
        {device.online ? "verbunden" : "weg"}
        {self ? " · dieses Gerät" : ""}
      </span>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <input
          className={fieldClass}
          value={name}
          placeholder="Name, zum Beispiel Küchen-Box"
          aria-label="Gerätename"
          onFocus={() => {
            focus.current = true;
          }}
          onBlur={() => {
            focus.current = false;
            if (name !== device.name) commit(name, device.zoneId);
          }}
          onChange={(event) => setName(event.target.value)}
        />
        <select
          className={fieldClass}
          aria-label="Bereich"
          value={device.zoneId ?? ""}
          onChange={(event) => commit(name, event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">Ohne Bereich</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted">
        {rooms[device.room] ?? "Sendung"}
        {device.userName ? ` · ${device.userName}` : ""}
        {device.hearing ? " · hört zu" : " · still"}
      </p>
    </li>
  );
}

export function DebugDesk() {
  const [data, setData] = useState<AreaSnapshot | null>(null);
  const [error, setError] = useState("");
  const [id, setId] = useState("");

  useEffect(() => {
    setId(deviceId());
  }, []);

  useEffect(() => {
    let stop = false;
    const load = () => {
      void getAreas()
        .then((next) => {
          if (!stop) {
            setData(next);
            setError("");
          }
        })
        .catch((caught) => {
          if (!stop) setError(errorText(caught));
        });
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  const self = data?.devices.find((device) => device.id === id) ?? null;

  return (
    <div className="grid gap-4">
      <Panel title="Diese Verbindung">
        <p className="mb-3 text-sm text-muted">Was die Regie gerade von den Geräten weiß. Keine Zugangsdaten.</p>
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        <dl className="grid gap-2 text-sm">
          <DebugRow label="Meldung" value={self?.online ? "verbunden" : data ? "keine Antwort" : "—"} />
          <DebugRow label="Gerät" value={id || "—"} />
          <DebugRow label="Name" value={self?.name || "noch ohne Namen"} />
          <DebugRow label="Bereich" value={self ? data?.zones.find((zone) => zone.id === self.zoneId)?.name || "keiner" : "—"} />
          <DebugRow label="Lautstärke hier" value={self ? String(data?.zones.find((zone) => zone.id === self.zoneId)?.volume ?? data?.volume ?? "—") : "—"} />
          <DebugRow label="Ausgabe" value={data ? `${data.outputLabel}${data.receiverUrl ? ` · ${data.receiverUrl}` : ""}` : "—"} />
          <DebugRow label="Programm" value={data ? String(data.volume) : "—"} />
          <DebugRow label="Läuft" value={data ? `${data.air.title} · ${data.air.mode}${data.air.live ? " · live" : ""}` : "—"} />
          <DebugRow label="Start" value={data?.air.startedAt ? formatWhen(data.air.startedAt) : "—"} />
          <DebugRow label="Tonquelle" value={data?.air.youtubeId ? "Video, versteckt" : data?.air.audioUrl ? "Audiodatei" : "kein Ton"} />
        </dl>
      </Panel>
      <Panel title="Geräte">
        {!data ? <p className="text-sm text-muted">Verbindungen werden geladen.</p> : null}
        {data && data.devices.length === 0 ? <p className="text-sm text-muted">Noch keine Meldung.</p> : null}
        <ul className="grid gap-3">
          {data?.devices.map((device) => (
            <li key={device.id} className="grid gap-1 rounded-lg bg-surface-2 px-3 py-3 text-sm">
              <p className="font-medium text-ink">
                {device.name || "Unbenannt"}
                {device.id === id ? " · dieses Gerät" : ""}
              </p>
              <DebugRow label="Kennung" value={device.id} />
              <DebugRow label="Raum" value={`${rooms[device.room] ?? device.room}${device.userName ? ` · ${device.userName}` : ""}`} />
              <DebugRow label="Zustand" value={`${device.online ? "verbunden" : "weg"} · ${device.hearing ? "hört zu" : "still"} · ${device.lastSeen ? formatWhen(device.lastSeen) : "—"}`} />
              <DebugRow label="Bereich" value={data.zones.find((zone) => zone.id === device.zoneId)?.name ?? "keiner"} />
              <DebugRow label="Browser" value={device.userAgent || "—"} />
              <DebugRow label="Letzte Meldung" value={device.detail || "—"} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="text-subtle">{label}</dt>
      <dd className="min-w-0 break-all text-ink">{value}</dd>
    </div>
  );
}
