/** Regie. Jeder Abschnitt schreibt über eine eigene Serverfunktion, die Oberfläche hält kein Programm selbst. */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import type { FilterMode } from "@/lib/pulse/logic";
import {
  addPlaylistTrack,
  checkOutput,
  createPlaylist,
  deletePlaylist,
  deleteRelaySlot,
  deleteRule,
  deleteStation,
  generateModeration,
  getAdmin,
  airPiper,
  removePlaylistTrack,
  saveRelaySlot,
  saveRule,
  saveSettings,
  saveStation,
  searchMusic,
  setFallback,
  pruneWishes,
} from "@/lib/pulse/api";
import type { AdminSnapshot, OutputProbe, PlaylistRecord, SettingsRecord, TrackInput } from "@/lib/pulse/types";
import { Button, Field, Panel, TopBar, errorText, fieldClass, formatWhen } from "@/components/pulse-ui";
import { GuideButton, GuidePanel } from "@/components/pulse-guide";
import { MusicPlan } from "@/components/pulse-plan";
import { ServicesDesk } from "@/components/pulse-services";
import { UsersDesk } from "@/components/pulse-users";
import { cn } from "@/lib/utils";

type Section = "ausgabe" | "programm" | "musikplan" | "kalender" | "dienste" | "sender" | "playlists" | "moderation" | "nutzer";

const sections: { id: Section; label: string }[] = [
  { id: "ausgabe", label: "Ausgabe" },
  { id: "programm", label: "Programm" },
  { id: "musikplan", label: "Musikplan" },
  { id: "kalender", label: "Kalender" },
  { id: "dienste", label: "Dienste" },
  { id: "sender", label: "Sender" },
  { id: "playlists", label: "Playlists" },
  { id: "moderation", label: "Moderation" },
  { id: "nutzer", label: "Nutzer" },
];

export function AdminDesk() {
  const [data, setData] = useState<AdminSnapshot | null>(null);
  const [error, setError] = useState("");
  const [section, setSection] = useState<Section>("ausgabe");

  async function load() {
    try {
      setData(await getAdmin());
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
        <Link to="/dj" className="inline-flex h-11 items-center rounded-md px-3 text-sm text-ink">
          Pult
        </Link>
        <GuideButton />
        <UserButton />
      </TopBar>
      <main className="grid w-full min-w-0 grid-cols-1 gap-4 px-4 pb-10 sm:px-6">
        <div className="grid gap-2">
          <h1 className="font-display text-4xl tracking-tight">Regie</h1>
          <p className="max-w-2xl text-sm text-muted">
            Lautstärke, Filter und Wünsche gelten für alle. Ein Zeitfenster überschreibt sie nur solange es läuft.
          </p>
        </div>
        {!data && !error ? <p className="text-muted">Regie wird geladen.</p> : null}
        {error && !data ? (
          <Panel title="Kein Zugang">
            <p className="text-sm text-muted">{error}</p>
          </Panel>
        ) : null}
        {data ? (
          <>
            <GuidePanel role="admin" />
            <div className="flex gap-2 overflow-x-auto">
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "nav-pill h-11 shrink-0 rounded-md px-4 text-sm",
                    section === item.id ? "bg-signal text-signal-ink" : "bg-surface text-muted",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div key={section} className="rise">
              {section === "ausgabe" ? (
                <OutputForm initial={data.settings} suggested={data.suggestedReceiver} onSaved={setData} />
              ) : null}
              {section === "programm" ? <ProgramForm initial={data.settings} onSaved={setData} /> : null}
              {section === "musikplan" ? <MusicPlan data={data} onSaved={setData} /> : null}
              {section === "kalender" ? <Calendar data={data} onSaved={setData} /> : null}
              {section === "dienste" ? <ServicesDesk services={data.services} onSaved={setData} /> : null}
              {section === "sender" ? <Stations data={data} onSaved={setData} /> : null}
              {section === "playlists" ? <Playlists data={data} onSaved={setData} /> : null}
              {section === "moderation" ? <Moderation data={data} onSaved={setData} /> : null}
              {section === "nutzer" ? <UsersDesk data={data} onSaved={setData} /> : null}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function OutputForm({
  initial,
  suggested,
  onSaved,
}: {
  initial: SettingsRecord;
  suggested: string;
  onSaved: (data: AdminSnapshot) => void;
}) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<OutputProbe | null>(null);
  const [pending, setPending] = useState(false);
  const external = form.outputTarget !== "browser";

  async function save() {
    setPending(true);
    try {
      onSaved(await saveSettings({ data: form }));
      toast.success("Ausgabe gespeichert.");
    } catch (caught) {
      toast.error(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Wohin der Ton geht">
      <div className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["browser", "Dieser Browser"],
              ["sonos", "Sonos"],
              ["receiver", "Receiver"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setForm({ ...form, outputTarget: id })}
              className={cn(
                "h-11 rounded-md border border-line px-3 text-sm",
                form.outputTarget === id ? "bg-signal text-signal-ink" : "bg-surface-2 text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">Browser spielt hier. Sonos und Boxen über den Receiver.</p>
        {external ? (
          <div className="grid gap-3">
            <Field label="Receiver-Adresse" hint="Zum Beispiel http://192.168.1.40:8090">
              <input
                className={fieldClass}
                value={form.receiverUrl}
                onChange={(event) => setForm({ ...form, receiverUrl: event.target.value })}
              />
            </Field>
            {suggested && !form.receiverUrl ? (
              <Button variant="line" onClick={() => setForm({ ...form, receiverUrl: suggested })}>
                Test-Receiver übernehmen
              </Button>
            ) : null}
            {form.outputTarget === "sonos" ? (
              <>
                <Field label="Sonos-Raum">
                  <input
                    className={fieldClass}
                    value={form.sonosRoom}
                    onChange={(event) => setForm({ ...form, sonosRoom: event.target.value })}
                  />
                </Field>
                <Field label="Sonos-Gerät" hint="Leer prüft den Testlautsprecher. Sonst die IP des Sonos.">
                  <input
                    className={fieldClass}
                    value={form.sonosHost}
                    onChange={(event) => setForm({ ...form, sonosHost: event.target.value })}
                  />
                </Field>
              </>
            ) : null}
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                className="h-5 w-5 accent-signal"
                checked={form.monitorExternal}
                onChange={(event) => setForm({ ...form, monitorExternal: event.target.checked })}
              />
              Zusätzlich in diesem Browser mithören
            </label>
          </div>
        ) : null}
        <Field label={`Lautstärke ${form.volume}`}>
          <input
            type="range"
            min={0}
            max={100}
            value={form.volume}
            onChange={(event) => setForm({ ...form, volume: Number(event.target.value) })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => void save()}>
            Speichern
          </Button>
          <Button
            variant="line"
            onClick={() => {
              void checkOutput()
                .then((result) => setStatus(result))
                .catch((caught) =>
                  setStatus({ ok: false, usingSaved: true, detail: errorText(caught), lines: [] }),
                );
            }}
          >
            Verbindung prüfen
          </Button>
        </div>
        {status ? (
          <div className="grid gap-2">
            <p className="text-sm text-ink">{status.detail}</p>
            <ul className="grid gap-1">
              {status.lines.map((line) => (
                <li key={line.label} className="text-sm text-muted">
                  <span className={line.ok ? "text-ok" : "text-danger"}>{line.ok ? "Ok" : "Nicht ok"}</span>
                  {" · "}
                  {line.label}
                  {" · "}
                  {line.detail}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function ProgramForm({ initial, onSaved }: { initial: SettingsRecord; onSaved: (data: AdminSnapshot) => void }) {
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  return (
    <Panel title="Was laufen darf">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void saveSettings({ data: form })
            .then((next) => {
              onSaved(next);
              toast.success("Programm gespeichert.");
            })
            .catch((caught) => toast.error(errorText(caught)))
            .finally(() => setPending(false));
        }}
      >
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 accent-signal"
            checked={form.wishesEnabled}
            onChange={(event) => setForm({ ...form, wishesEnabled: event.target.checked })}
          />
          Wünsche annehmen
        </label>
        <Field label="Filter">
          <select
            className={fieldClass}
            value={form.explicitFilter}
            onChange={(event) => setForm({ ...form, explicitFilter: event.target.value as FilterMode })}
          >
            <option value="allow">Alles</option>
            <option value="clean">Explicit-Markierung sperren</option>
            <option value="strict">Streng, inklusive Begriffsliste</option>
          </select>
        </Field>
        <Field
          label="Zusätzliche Sperrwörter"
          hint="Komma oder Zeile. Der strenge Filter nutzt sie zusammen mit einer festen Basisliste."
        >
          <textarea
            className="min-h-20 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            value={form.extraBlocklist}
            onChange={(event) => setForm({ ...form, extraBlocklist: event.target.value })}
          />
        </Field>
        <Field label="Downvotes bis ein Titel fliegt" hint="Mindestens 2. Jede Person stimmt pro Titel nur einmal.">
          <input
            className={fieldClass}
            type="number"
            min={2}
            max={20}
            value={form.downvoteKick}
            onChange={(event) => setForm({ ...form, downvoteKick: Number(event.target.value) })}
          />
        </Field>
        <Field label="Volle Queue">
          <select
            className={fieldClass}
            value={form.wishPrune}
            onChange={(event) => setForm({ ...form, wishPrune: event.target.value === "off" ? "off" : "auto" })}
          >
            <option value="auto">Schwache Wünsche automatisch raus</option>
            <option value="off">Nichts automatisch entfernen</option>
          </select>
        </Field>
        {form.wishPrune === "auto" ? (
          <Field
            label="Ab so vielen Wünschen"
            hint="Ohne Upvote oder mit mehr Runter als Hoch. Ganz neue bleiben kurz liegen."
          >
            <input
              className={fieldClass}
              type="number"
              min={4}
              max={40}
              value={form.wishPruneAt}
              onChange={(event) => setForm({ ...form, wishPruneAt: Number(event.target.value) })}
            />
          </Field>
        ) : null}
        <Field label="Musikquelle">
          <select
            className={fieldClass}
            value={form.musicSource}
            onChange={(event) =>
              setForm({
                ...form,
                musicSource:
                  event.target.value === "spotify"
                    ? "spotify"
                    : event.target.value === "archive"
                      ? "archive"
                      : event.target.value === "youtube"
                        ? "youtube"
                        : "preview",
              })
            }
          >
            <option value="preview">Vorschau-Katalog, 30 Sekunden</option>
            <option value="archive">Internet Archive, ganze Titel, ohne Abo</option>
            <option value="spotify">Spotify</option>
            <option value="youtube">YouTube</option>
          </select>
        </Field>
        <p className="text-sm text-subtle">Spotify, YouTube, Microsoft 365 und Piper verbindest du unter Dienste.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            Speichern
          </Button>
          <Button
            type="button"
            variant="line"
            onClick={() => {
              void pruneWishes()
                .then((next) => {
                  onSaved(next);
                  toast.success(next.removed > 0 ? `${next.removed} Wünsche raus.` : "Nichts zum Aufräumen.");
                })
                .catch((caught) => toast.error(errorText(caught)));
            }}
          >
            Jetzt aufräumen
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function Calendar({ data, onSaved }: { data: AdminSnapshot; onSaved: (next: AdminSnapshot) => void }) {
  const [title, setTitle] = useState("Townhall");
  const [startsAt, setStartsAt] = useState(localInput(60));
  const [endsAt, setEndsAt] = useState(localInput(180));
  const [volume, setVolume] = useState("");
  const [wishes, setWishes] = useState<"keep" | "on" | "off">("off");
  const [filter, setFilter] = useState<"keep" | FilterMode>("strict");
  const [note, setNote] = useState("Offizielle Veranstaltung");
  const [pending, setPending] = useState(false);

  return (
    <div className="grid gap-4">
      <Panel title="Zeitfenster">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            void saveRule({
              data: {
                title,
                startsAt: new Date(startsAt).toISOString(),
                endsAt: new Date(endsAt).toISOString(),
                volume: volume === "" ? null : Number(volume),
                wishesEnabled: wishes === "keep" ? null : wishes === "on",
                explicitFilter: filter === "keep" ? null : filter,
                note,
              },
            })
              .then((next) => {
                onSaved(next);
                toast.success("Regel liegt im Kalender.");
              })
              .catch((caught) => toast.error(errorText(caught)))
              .finally(() => setPending(false));
          }}
        >
          <Field label="Name">
            <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Beginn">
              <input className={fieldClass} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </Field>
            <Field label="Ende">
              <input className={fieldClass} type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Lautstärke" hint="Leer lässt den Normalwert.">
              <input className={fieldClass} inputMode="numeric" value={volume} onChange={(event) => setVolume(event.target.value)} />
            </Field>
            <Field label="Wünsche">
              <select className={fieldClass} value={wishes} onChange={(event) => setWishes(event.target.value as typeof wishes)}>
                <option value="keep">Unverändert</option>
                <option value="on">An</option>
                <option value="off">Aus</option>
              </select>
            </Field>
            <Field label="Filter">
              <select className={fieldClass} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
                <option value="keep">Unverändert</option>
                <option value="allow">Alles</option>
                <option value="clean">Ohne Explicit</option>
                <option value="strict">Streng</option>
              </select>
            </Field>
          </div>
          <Field label="Notiz">
            <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <Button type="submit" disabled={pending}>
            Regel anlegen
          </Button>
        </form>
      </Panel>
      <Panel title="Liegt an">
        {data.rules.length === 0 ? <p className="text-sm text-muted">Noch keine Zeitfenster.</p> : null}
        <ul className="grid min-w-0 grid-cols-1 gap-3">
          {data.rules.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {rule.title}
                  {rule.active ? <span className="ml-2 text-sm text-ok">aktiv</span> : null}
                </p>
                <p className="text-sm text-muted">
                  {formatWhen(rule.startsAt)} – {formatWhen(rule.endsAt)}
                  {rule.volume != null ? ` · ${rule.volume}` : ""}
                  {rule.wishesEnabled === false ? " · Wünsche aus" : ""}
                  {rule.wishesEnabled === true ? " · Wünsche an" : ""}
                  {rule.explicitFilter ? ` · ${rule.explicitFilter}` : ""}
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => {
                  void deleteRule({ data: { id: rule.id } })
                    .then(onSaved)
                    .catch((caught) => toast.error(errorText(caught)));
                }}
              >
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Playlists({ data, onSaved }: { data: AdminSnapshot; onSaved: (next: AdminSnapshot) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState(data.playlists[0]?.id ?? 0);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<TrackInput[]>([]);

  useEffect(() => {
    if (!data.playlists.some((list) => list.id === target) && data.playlists[0]) {
      setTarget(data.playlists[0].id);
    }
  }, [data.playlists, target]);

  return (
    <div className="grid gap-4">
      <Panel title="Hausplaylist und weitere">
        <p className="mb-4 text-sm text-muted">Ohne Wünsche läuft die markierte Playlist.</p>
        <form
          className="mb-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void createPlaylist({ data: { name } })
              .then((next) => {
                onSaved(next);
                setName("");
              })
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          <input className={fieldClass} placeholder="Neue Playlist" value={name} onChange={(event) => setName(event.target.value)} />
          <Button type="submit" disabled={name.trim().length < 2}>
            Anlegen
          </Button>
        </form>
        <div className="grid gap-4">
          {data.playlists.map((list) => (
            <PlaylistCard key={list.id} list={list} onSaved={onSaved} />
          ))}
        </div>
      </Panel>
      <Panel title="Titel hinzufügen">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void searchMusic({ data: { query } })
              .then(setHits)
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          <select className={fieldClass} value={target} onChange={(event) => setTarget(Number(event.target.value))}>
            {data.playlists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <input className={fieldClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suchen" />
          <Button type="submit">Suchen</Button>
        </form>
        <ul className="mt-3 grid gap-2">
          {hits.map((hit) => (
            <li key={`${hit.externalId}-${hit.title}`} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm">
                {hit.title} <span className="text-muted">· {hit.artist}</span>
              </span>
              <Button
                variant="line"
                onClick={() => {
                  void addPlaylistTrack({ data: { playlistId: target, track: hit } })
                    .then(onSaved)
                    .catch((caught) => toast.error(errorText(caught)));
                }}
              >
                Dazu
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function PlaylistCard({ list, onSaved }: { list: PlaylistRecord; onSaved: (next: AdminSnapshot) => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <article className="rounded-lg border border-line p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{list.name}</h3>
        <div className="flex gap-2">
          {list.isFallback ? (
            <span className="inline-flex h-11 items-center text-sm text-ok">läuft ohne Wünsche</span>
          ) : (
            <Button variant="line" onClick={() => void setFallback({ data: { id: list.id } }).then(onSaved).catch((e) => toast.error(errorText(e)))}>
              Als Hausplaylist
            </Button>
          )}
          <Button variant="ghost" onClick={() => (confirm ? void deletePlaylist({ data: { id: list.id } }).then(onSaved) : setConfirm(true))}>
            {confirm ? "Wirklich löschen" : "Löschen"}
          </Button>
        </div>
      </div>
      <ul className="grid min-w-0 grid-cols-1 gap-1">
        {list.tracks.length === 0 ? <li className="text-sm text-subtle">Noch leer.</li> : null}
        {list.tracks.map((track) => (
          <li key={track.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {track.title} <span className="text-muted">· {track.artist}</span>
            </span>
            <button
              type="button"
              className="h-11 shrink-0 px-2 text-xs text-subtle"
              onClick={() => void removePlaylistTrack({ data: { id: track.id } }).then(onSaved).catch((e) => toast.error(errorText(e)))}
            >
              Raus
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Moderation({ data, onSaved }: { data: AdminSnapshot; onSaved: (next: AdminSnapshot) => void }) {
  const [form, setForm] = useState(data.settings);
  const [immediate, setImmediate] = useState(false);
  const [script, setScript] = useState("");
  const topics = new Set(form.moderatorTopics.split(",").map((part) => part.trim()).filter(Boolean));

  function toggle(topic: string) {
    const next = new Set(topics);
    if (next.has(topic)) next.delete(topic);
    else next.add(topic);
    setForm({ ...form, moderatorTopics: [...next].join(",") });
  }

  return (
    <div className="grid gap-4">
      <Panel title="KI-Moderator">
        <div className="grid gap-4">
          <p className="text-sm text-muted">Zu den Uhrzeiten eine kurze Ansage. Erzeugen bleibt ein Knopfdruck.</p>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-signal"
              checked={form.moderatorEnabled}
              onChange={(event) => setForm({ ...form, moderatorEnabled: event.target.checked })}
            />
            Slots aktiv
          </label>
          <Field label="Uhrzeiten" hint="Zum Beispiel 09:00, 12:30, 16:00">
            <input
              className={fieldClass}
              value={form.moderatorSlots}
              onChange={(event) => setForm({ ...form, moderatorSlots: event.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {(["lokal", "firma", "tech"] as const).map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => toggle(topic)}
                className={cn(
                  "h-11 rounded-md px-4 text-sm",
                  topics.has(topic) ? "bg-signal text-signal-ink" : "bg-surface-2 text-muted",
                )}
              >
                {topic}
              </button>
            ))}
          </div>
          <Field label="Firmennotizen" hint="Nur das darf als interne Info vorkommen. Nichts wird dazuerfunden.">
            <textarea
              className="min-h-24 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              value={form.companyNotes}
              onChange={(event) => setForm({ ...form, companyNotes: event.target.value })}
            />
          </Field>
          <p className="text-sm text-subtle">Nächster Slot: {data.nextSlot ? formatWhen(data.nextSlot) : "keiner"}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="line"
              onClick={() => {
                void saveSettings({ data: form })
                  .then((next) => {
                    onSaved(next);
                    toast.success("Moderation gespeichert.");
                  })
                  .catch((caught) => toast.error(errorText(caught)));
              }}
            >
              Einstellungen speichern
            </Button>
            <label className="flex h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-signal" checked={immediate} onChange={(event) => setImmediate(event.target.checked)} />
              Sofort auf Sendung
            </label>
            <Button
              onClick={() => {
                void generateModeration({ data: { immediate } }).then(async (result) => {
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  setScript(result.text);
                  onSaved(await getAdmin());
                  toast.success(result.airAt ? "Liegt bis zum Slot bereit." : "Moderation läuft.");
                });
              }}
            >
              Skript erzeugen
            </Button>
            <Button
              variant="line"
              disabled={script.trim().length < 8}
              onClick={() => {
                void airPiper({ data: { title: "Moderation", text: script } })
                  .then(async () => {
                    onSaved(await getAdmin());
                    toast.success("Piper ist auf Sendung.");
                  })
                  .catch((caught) => toast.error(errorText(caught)));
              }}
            >
              Mit Piper sprechen
            </Button>
          </div>
          {script ? <p className="text-sm text-ink">{script}</p> : null}
        </div>
      </Panel>
      <Panel title="Letzte Ansagen">
        {data.announcements.length === 0 ? <p className="text-sm text-muted">Noch keine.</p> : null}
        <ul className="grid min-w-0 grid-cols-1 gap-3">
          {data.announcements.map((item) => (
            <li key={item.id} className="border-t border-line pt-3">
              <p className="text-sm font-medium">
                {item.title} <span className="font-normal text-subtle">{item.status}</span>
              </p>
              <p className="text-sm text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Stations({ data, onSaved }: { data: AdminSnapshot; onSaved: (next: AdminSnapshot) => void }) {
  const [name, setName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [note, setNote] = useState("");
  const [stationId, setStationId] = useState(data.stations[0]?.id ?? 0);
  const [title, setTitle] = useState("Nachrichten");
  const [startsAt, setStartsAt] = useState(localInput(30));
  const [endsAt, setEndsAt] = useState(localInput(45));

  return (
    <div className="grid gap-4">
      <Panel title="Echte Sender">
        <p className="mb-4 text-sm text-muted">Öffentliche https-Streams. YouTube bleibt im Browser.</p>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveStation({ data: { name, streamUrl, note } })
              .then((next) => {
                onSaved(next);
                setName("");
                setStreamUrl("");
                toast.success("Sender liegt bereit.");
              })
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Stream-Adresse">
              <input
                className={fieldClass}
                value={streamUrl}
                placeholder="https://"
                onChange={(event) => setStreamUrl(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Notiz">
            <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <Button type="submit" disabled={name.trim().length < 2 || streamUrl.trim().length < 8}>
            Sender anlegen
          </Button>
        </form>
        <ul className="mt-4 grid gap-3">
          {data.stations.map((station) => (
            <li key={station.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <div className="min-w-0">
                <p className="font-medium">{station.name}</p>
                <p className="truncate text-sm text-muted">{station.note || station.streamUrl}</p>
              </div>
              <Button
                variant="danger"
                onClick={() => {
                  void deleteStation({ data: { id: station.id } })
                    .then(onSaved)
                    .catch((caught) => toast.error(errorText(caught)));
                }}
              >
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Zeitplan">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveRelaySlot({
              data: {
                stationId,
                title,
                startsAt: new Date(startsAt).toISOString(),
                endsAt: new Date(endsAt).toISOString(),
              },
            })
              .then((next) => {
                onSaved(next);
                toast.success("Fenster liegt im Plan.");
              })
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          <Field label="Bezeichnung">
            <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Sender">
            <select className={fieldClass} value={stationId} onChange={(event) => setStationId(Number(event.target.value))}>
              {data.stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Beginn">
              <input className={fieldClass} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </Field>
            <Field label="Ende">
              <input className={fieldClass} type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={!stationId || title.trim().length < 2}>
            Fenster anlegen
          </Button>
        </form>
        <ul className="mt-4 grid gap-3">
          {data.slots.length === 0 ? <li className="text-sm text-muted">Noch kein Zeitplan.</li> : null}
          {data.slots.map((slot) => (
            <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <div>
                <p className="font-medium">
                  {slot.title}
                  {slot.active ? <span className="ml-2 text-sm text-ok">aktiv</span> : null}
                </p>
                <p className="text-sm text-muted">
                  {slot.stationName} · {formatWhen(slot.startsAt)} – {formatWhen(slot.endsAt)}
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => {
                  void deleteRelaySlot({ data: { id: slot.id } })
                    .then(onSaved)
                    .catch((caught) => toast.error(errorText(caught)));
                }}
              >
                Entfernen
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function localInput(plusMinutes: number): string {
  const date = new Date(Date.now() + plusMinutes * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
