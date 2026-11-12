/** Spotify, YouTube, Microsoft 365 und Piper. Geheimnisse gehen nur zum Server, nie zurück. */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { saveService, testService } from "@/lib/pulse/api";
import { PIPER_VOICES, type PiperVoiceId } from "@/lib/pulse/logic";
import type { AdminSnapshot, ServiceState } from "@/lib/pulse/types";
import { piperLine, speakPiper } from "@/lib/pulse/voice";
import { Button, Field, Panel, errorText, fieldClass } from "@/components/pulse-ui";

export function ServicesDesk({
  services,
  onSaved,
}: {
  services: ServiceState;
  onSaved: (next: AdminSnapshot) => void;
}) {
  return (
    <div className="grid gap-4">
      <SpotifyCard services={services} onSaved={onSaved} />
      <YouTubeCard services={services} onSaved={onSaved} />
      <OfficeCard services={services} onSaved={onSaved} />
      <PiperCard services={services} onSaved={onSaved} />
    </div>
  );
}

function SpotifyCard({ services, onSaved }: { services: ServiceState; onSaved: (next: AdminSnapshot) => void }) {
  const [enabled, setEnabled] = useState(services.spotify.enabled);
  const [clientId, setClientId] = useState(services.spotify.clientId);
  const [secret, setSecret] = useState("");
  const [notice, setNotice] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("spotify") ?? "";
    const texts: Record<string, string> = {
      ok: "Spotify-Konto ist verbunden.",
      fehlt: "Zuerst die Client-ID speichern. Ein Passwort wird hier nie abgefragt.",
      state: "Die Verbindung wurde unterbrochen. Nochmal versuchen.",
      token: "Spotify hat die Anmeldung nicht angenommen. Die Redirect-URI muss im Dashboard genau so stehen.",
      recht: "Nur Pult und Regie verbinden das Konto.",
      login: "Zuerst anmelden.",
    };
    setNotice(texts[code] ?? "");
    setRedirectUri(`${window.location.origin}/api/spotify/callback`);
    if (!code) return;
    url.searchParams.delete("spotify");
    const next = `${url.pathname}${url.search}`;
    window.history.replaceState({}, "", next);
  }, []);
  return (
    <Panel title="Spotify">
      <p className="mb-3 text-sm text-muted">
        Die Suche nimmt den Katalog, der Ton ist in jedem Browser derselbe und bleibt gleich. Das Konto hängt einmal über
        Spotify selbst, nicht über ein Passwort hier.
        {services.spotify.accountName ? ` Verbunden als ${services.spotify.accountName}.` : " Noch kein Konto verbunden."}
      </p>
      {notice ? <p className="mb-3 text-sm text-ink">{notice}</p> : null}
      <Status detail={services.spotify.detail} />
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveService({ data: { id: "spotify", enabled, clientId, secret } })
            .then((next) => {
              onSaved(next);
              setSecret("");
              toast.success("Spotify gespeichert.");
            })
            .catch((caught) => toast.error(errorText(caught)));
        }}
      >
        <Toggle checked={enabled} onChange={setEnabled} label="Suche zulassen" />
        <Field label="Client-ID">
          <input className={fieldClass} value={clientId} onChange={(event) => setClientId(event.target.value)} />
        </Field>
        <Field label="Geheimnis" hint={services.spotify.secretSet ? "Gesetzt. Leer lassen, um es zu behalten. Für PKCE freiwillig." : "Freiwillig, wenn die App PKCE erlaubt."}>
          <input className={fieldClass} type="password" value={secret} autoComplete="off" onChange={(event) => setSecret(event.target.value)} />
        </Field>
        <Field label="Redirect-URI" hint="Im Spotify-Dashboard unter der App eintragen.">
          <input className={fieldClass} readOnly value={redirectUri} onFocus={(event) => event.currentTarget.select()} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Speichern</Button>
          <Button type="button" variant="line" onClick={() => window.location.assign("/api/spotify/start")}>
            {services.spotify.accountName ? "Konto wechseln" : "Mit Spotify verbinden"}
          </Button>
          <Button type="button" variant="line" onClick={() => void probe("spotify", onSaved)}>
            Verbindung prüfen
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function YouTubeCard({ services, onSaved }: { services: ServiceState; onSaved: (next: AdminSnapshot) => void }) {
  const [enabled, setEnabled] = useState(services.youtube.enabled);
  const [secret, setSecret] = useState("");
  return (
    <Panel title="YouTube">
      <p className="mb-3 text-sm text-muted">
        Eigener Dienst neben Spotify. Hörer können suchen oder einen Link legen, sobald der Schalter an ist. Der Ton bleibt
        im Browser. Ein API-Schlüssel ist freiwillig und schärft die Treffer.
      </p>
      <Status detail={services.youtube.detail} />
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveService({ data: { id: "youtube", enabled, secret } })
            .then((next) => {
              onSaved(next);
              setSecret("");
              toast.success("YouTube gespeichert.");
            })
            .catch((caught) => toast.error(errorText(caught)));
        }}
      >
        <Toggle checked={enabled} onChange={setEnabled} label="Als Musikquelle anbieten" />
        <Field label="API-Schlüssel" hint={services.youtube.keySet ? "Gesetzt. Leer lassen, um ihn zu behalten." : "Ohne Schlüssel die öffentliche Suche."}>
          <input className={fieldClass} type="password" value={secret} autoComplete="off" onChange={(event) => setSecret(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Speichern</Button>
          <Button type="button" variant="line" onClick={() => void probe("youtube", onSaved)}>
            Verbindung prüfen
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function OfficeCard({ services, onSaved }: { services: ServiceState; onSaved: (next: AdminSnapshot) => void }) {
  const [enabled, setEnabled] = useState(services.o365.enabled);
  const [tenant, setTenant] = useState(services.o365.tenant);
  const [clientId, setClientId] = useState(services.o365.clientId);
  const [mailbox, setMailbox] = useState(services.o365.mailbox);
  const [secret, setSecret] = useState("");
  return (
    <Panel title="Microsoft 365">
      <p className="mb-3 text-sm text-muted">
        Dieselbe App-Registrierung für Kalender und Anmeldung. Delegiert: openid, profile, email. Als Anwendung: Calendars.Read,
        mit Administratorzustimmung. Plattform Web, Redirect-URI https://öffentliche-adresse/api/microsoft/callback. Das Postfach
        liefert die Termine der nächsten zwei Tage in den Musikplan, inklusive Lautstärke aus dem Text.
      </p>
      <Status detail={services.o365.detail} />
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveService({ data: { id: "o365", enabled, tenant, clientId, mailbox, secret } })
            .then((next) => {
              onSaved(next);
              setSecret("");
              toast.success("Microsoft 365 gespeichert.");
            })
            .catch((caught) => toast.error(errorText(caught)));
        }}
      >
        <Toggle checked={enabled} onChange={setEnabled} label="Kalender und Anmeldung" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mandant">
            <input className={fieldClass} value={tenant} onChange={(event) => setTenant(event.target.value)} placeholder="firma.onmicrosoft.com" />
          </Field>
          <Field label="Client-ID">
            <input className={fieldClass} value={clientId} onChange={(event) => setClientId(event.target.value)} />
          </Field>
        </div>
        <Field label="Postfach">
          <input className={fieldClass} value={mailbox} onChange={(event) => setMailbox(event.target.value)} placeholder="studio@firma.de" />
        </Field>
        <Field label="Geheimnis" hint={services.o365.secretSet ? "Gesetzt. Leer lassen, um es zu behalten." : "Client Secret der App."}>
          <input className={fieldClass} type="password" value={secret} autoComplete="off" onChange={(event) => setSecret(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Speichern</Button>
          <Button type="button" variant="line" onClick={() => void probe("o365", onSaved)}>
            Verbindung prüfen
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function PiperCard({ services, onSaved }: { services: ServiceState; onSaved: (next: AdminSnapshot) => void }) {
  const [enabled, setEnabled] = useState(services.piper.enabled);
  const [voice, setVoice] = useState<PiperVoiceId>(services.piper.voice);
  const [endpoint, setEndpoint] = useState(services.piper.endpoint);
  const current = PIPER_VOICES.find((item) => item.id === voice) ?? PIPER_VOICES[0]!;
  return (
    <Panel title="Piper">
      <p className="mb-3 text-sm text-muted">
        Weibliche Sendestimme. {current.name}, {current.detail}. Ohne Adresse spricht der Browser. Mit Adresse kommt dieselbe
        Ansage als Datei auf Sonos und Receiver. Das Installationsskript legt Kerstin und Eva auf den Rechner und startet den
        Dienst auf Port 5000. Aus dem Container ist das nicht 127.0.0.1, sondern http://host.docker.internal:5000.
      </p>
      <Status detail={services.piper.detail} />
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void saveService({ data: { id: "piper", enabled, voice, endpoint } })
            .then((next) => {
              onSaved(next);
              toast.success("Piper gespeichert.");
            })
            .catch((caught) => toast.error(errorText(caught)));
        }}
      >
        <Toggle checked={enabled} onChange={setEnabled} label="Piper für Durchsagen" />
        <Field label="Stimme">
          <select className={fieldClass} value={voice} onChange={(event) => setVoice(event.target.value as PiperVoiceId)}>
            {PIPER_VOICES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.detail}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Piper-Adresse" hint="Leer: nur Browser. Sonst POST mit Text und Stimme, Antwort audio/wav.">
          <input className={fieldClass} value={endpoint} placeholder="http://host.docker.internal:5000" onChange={(event) => setEndpoint(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Speichern</Button>
          <Button
            type="button"
            variant="line"
            onClick={() => {
              speakPiper(piperLine(voice), voice);
              toast.success(`${current.name} spricht hier.`);
            }}
          >
            Stimme hören
          </Button>
          <Button type="button" variant="line" onClick={() => void probe("piper", onSaved)}>
            Verbindung prüfen
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function Status({ detail }: { detail: string }) {
  return <p className="mb-3 text-sm text-ink">{detail || "Noch nicht geprüft."}</p>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" className="h-5 w-5 accent-signal" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function probe(id: "spotify" | "youtube" | "o365" | "piper", onSaved: (next: AdminSnapshot) => void) {
  return testService({ data: { id } })
    .then((result) => {
      onSaved(result.snapshot);
      if (result.ok) toast.success(result.detail);
      else toast.error(result.detail);
    })
    .catch((caught) => toast.error(errorText(caught)));
}
