/** Musikplan für die Regie, Laufplan fürs Pult. Dieselben Blöcke, zwei Tiefen. */
import { useState } from "react";
import { toast } from "sonner";
import { deletePlan, importOutlook, savePlan } from "@/lib/pulse/api";
import { VOLUME_WISHES, type FilterMode, type PlanEnergy, type PlanKind } from "@/lib/pulse/logic";
import type { AdminSnapshot, PlanBlock, PlanInput, RelayStation } from "@/lib/pulse/types";
import { Button, Field, Panel, errorText, fieldClass, formatWhen } from "@/components/pulse-ui";
import { cn } from "@/lib/utils";

const kinds: { id: PlanKind; label: string }[] = [
  { id: "musik", label: "Musik" },
  { id: "pause", label: "Pause" },
  { id: "meeting", label: "Meeting" },
  { id: "ansage", label: "Ansage" },
  { id: "relais", label: "Relais" },
  { id: "event", label: "Termin" },
];

export function MusicPlan({
  data,
  onSaved,
}: {
  data: AdminSnapshot;
  onSaved: (next: AdminSnapshot) => void;
}) {
  const [editing, setEditing] = useState<PlanBlock | null>(null);
  const [ics, setIcs] = useState("");
  const blocks = data.plan;

  return (
    <div className="grid gap-4">
      <Panel title="Tag auf einen Blick">
        <p className="mb-4 text-sm text-muted">
          Lautstärke, Wünsche und Energie gelten, solange der Block läuft. Danach wieder die Normalwerte.
        </p>
        <DayStrip blocks={blocks} />
        {blocks.length === 0 ? <p className="mt-4 text-sm text-muted">Heute liegt noch nichts im Plan.</p> : null}
        <ul className="mt-4 grid gap-3">
          {blocks.map((block) => (
            <li key={block.id} className="grid gap-2 border-t border-line pt-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {block.title}
                    {block.active ? <span className="ml-2 text-sm text-ok">jetzt</span> : null}
                    {block.source === "o365" ? <span className="ml-2 text-sm text-subtle">Outlook</span> : null}
                  </p>
                  <p className="text-sm text-muted">
                    {formatWhen(block.startsAt)} – {formatWhen(block.endsAt)}
                    {" · "}
                    {kindLabel(block.kind)}
                    {block.volume != null ? ` · ${block.volume}` : " · Lautstärke normal"}
                    {block.wishesEnabled === false ? " · Wünsche aus" : ""}
                    {block.wishesEnabled === true ? " · Wünsche an" : ""}
                    {" · "}
                    {block.energy}
                  </p>
                  {block.wishNote ? <p className="text-sm text-ink">{block.wishNote}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="line" onClick={() => setEditing(block)}>
                    Ändern
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      void deletePlan({ data: { id: block.id } })
                        .then(onSaved)
                        .catch((caught) => toast.error(errorText(caught)));
                    }}
                  >
                    Weg
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <PlanForm
        key={editing?.id ?? "neu"}
        stations={data.stations}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={(next) => {
          setEditing(null);
          onSaved(next);
        }}
      />
      <Panel title="Aus Outlook">
        <p className="mb-3 text-sm text-muted">
          Microsoft 365 liest das verbundene Postfach. Ohne App reicht ein ICS-Export aus Outlook. Wörter wie „leise“
          oder „keine Wünsche“ setzen Lautstärke und Wunscherlaubnis.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void importOutlook({ data: {} })
                .then((result) => {
                  onSaved(result.snapshot);
                  toast.success(`${result.imported} Termine aus Microsoft 365.`);
                })
                .catch((caught) => toast.error(errorText(caught)));
            }}
          >
            Kalender holen
          </Button>
          <Button variant="line" onClick={() => setIcs(sampleIcs())}>
            Beispiel-ICS
          </Button>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void importOutlook({ data: { ics } })
              .then((result) => {
                onSaved(result.snapshot);
                setIcs("");
                toast.success(`${result.imported} Termine im Musikplan.`);
              })
              .catch((caught) => toast.error(errorText(caught)));
          }}
        >
          <Field label="ICS einfügen" hint="Outlook: Kalender, Freigeben, ICS herunterladen.">
            <textarea
              className="min-h-28 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              value={ics}
              onChange={(event) => setIcs(event.target.value)}
              placeholder="BEGIN:VCALENDAR"
            />
          </Field>
          <Button type="submit" disabled={ics.trim().length < 12}>
            ICS übernehmen
          </Button>
        </form>
      </Panel>
    </div>
  );
}

export function DjRundown({ blocks }: { blocks: PlanBlock[] }) {
  const now = blocks.find((block) => block.active);
  const later = blocks.filter((block) => !block.active && !block.past);
  const earlier = blocks.filter((block) => block.past);
  return (
    <Panel title="Laufplan">
      <p className="mb-4 text-sm text-muted">
        Was die Regie für dich aufgeschrieben hat: Lautstärke, Wünsche, Stimmung und was du sagst. Ändern tut das die Regie.
      </p>
      {blocks.length === 0 ? <p className="text-sm text-muted">Heute liegt noch kein Laufplan.</p> : null}
      <div className="grid gap-4">
        {now ? <RundownCard block={now} label="Jetzt" /> : <p className="text-sm text-muted">Gerade kein Block. Es gelten die Normalwerte.</p>}
        {later.length > 0 ? (
          <div className="grid gap-3">
            <h3 className="text-sm font-medium text-muted">Danach</h3>
            {later.map((block) => (
              <RundownCard key={block.id} block={block} label="Als Nächstes" />
            ))}
          </div>
        ) : null}
        {earlier.length > 0 ? (
          <div className="grid gap-3">
            <h3 className="text-sm font-medium text-muted">Vorbei</h3>
            {earlier.map((block) => (
              <RundownCard key={block.id} block={block} label="Vorbei" dim />
            ))}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function RundownCard({ block, label, dim }: { block: PlanBlock; label: string; dim?: boolean }) {
  const points = block.talkPoints
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <article className={cn("grid gap-2 rounded-lg border border-line bg-surface-2 p-4", dim && "opacity-70")}>
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
      <h3 className="font-display text-2xl tracking-tight">{block.title}</h3>
      <p className="text-sm text-muted">
        {formatWhen(block.startsAt)} – {formatWhen(block.endsAt)}
        {" · "}
        {kindLabel(block.kind)}
        {block.stationName ? ` · ${block.stationName}` : ""}
        {block.source === "o365" ? " · Outlook" : ""}
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-subtle">Lautstärke-Wunsch</dt>
          <dd>{block.volume != null ? block.volume : "Normalwert der Regie"}</dd>
        </div>
        <div>
          <dt className="text-subtle">Wünsche</dt>
          <dd>{block.wishesEnabled == null ? "Unverändert" : block.wishesEnabled ? "An" : "Aus"}</dd>
        </div>
        <div>
          <dt className="text-subtle">Energie</dt>
          <dd>{block.energy}</dd>
        </div>
        <div>
          <dt className="text-subtle">Stimmung</dt>
          <dd>{block.mood || "—"}</dd>
        </div>
      </dl>
      {block.wishNote ? <p className="text-sm text-ink">{block.wishNote}</p> : null}
      <div>
        <p className="text-sm text-subtle">Für dich</p>
        <p className="whitespace-pre-wrap text-sm text-ink">{block.djBrief || "Keine ausführliche Notiz."}</p>
      </div>
      {points.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {points.map((point) => (
            <li key={point} className="border-t border-line pt-1">
              {point}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function DayStrip({ blocks }: { blocks: PlanBlock[] }) {
  const start = dayStart();
  const span = 14 * 60 * 60 * 1000;
  return (
    <div className="overflow-x-auto">
      <div className="relative h-20 min-w-[40rem] rounded-md bg-canvas">
        {blocks.map((block) => {
          const left = Math.max(0, Math.min(1, (new Date(block.startsAt).getTime() - start) / span));
          const right = Math.max(left, Math.min(1, (new Date(block.endsAt).getTime() - start) / span));
          const width = Math.max(0.04, right - left);
          return (
            <div
              key={block.id}
              className={cn(
                "absolute top-3 flex h-14 items-center overflow-hidden rounded-md px-2 text-xs",
                block.active ? "bg-signal text-signal-ink" : "bg-surface-2 text-ink",
              )}
              style={{ left: `${left * 100}%`, width: `${width * 100}%` }}
              title={block.wishNote || block.title}
            >
              <span className="truncate">
                {block.title}
                {block.volume != null ? ` ${block.volume}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanForm({
  stations,
  initial,
  onSaved,
  onCancel,
}: {
  stations: RelayStation[];
  initial: PlanBlock | null;
  onSaved: (next: AdminSnapshot) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PlanInput>({
    id: initial?.id,
    title: initial?.title ?? "Arbeitsmusik",
    kind: initial?.kind ?? "musik",
    startsAt: initial ? toLocal(initial.startsAt) : localInput(30),
    endsAt: initial ? toLocal(initial.endsAt) : localInput(90),
    volume: initial?.volume ?? 36,
    wishesEnabled: initial?.wishesEnabled ?? true,
    explicitFilter: initial?.explicitFilter ?? null,
    energy: initial?.energy ?? "mittel",
    wishNote: initial?.wishNote ?? "",
    mood: initial?.mood ?? "",
    djBrief: initial?.djBrief ?? "",
    talkPoints: initial?.talkPoints ?? "",
    stationId: initial?.stationId ?? null,
  });
  const [pending, setPending] = useState(false);

  return (
    <Panel title={initial ? "Block ändern" : "Block anlegen"}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void savePlan({
            data: {
              ...form,
              startsAt: new Date(form.startsAt).toISOString(),
              endsAt: new Date(form.endsAt).toISOString(),
            },
          })
            .then((next) => {
              onSaved(next);
              toast.success(initial ? "Block liegt neu." : "Block liegt im Musikplan.");
            })
            .catch((caught) => toast.error(errorText(caught)))
            .finally(() => setPending(false));
        }}
      >
        <div className="flex flex-wrap gap-2">
          {VOLUME_WISHES.map((wish) => (
            <button
              key={wish.id}
              type="button"
              className="h-11 rounded-md bg-surface-2 px-3 text-sm text-ink"
              onClick={() => setForm({ ...form, volume: wish.volume, wishNote: wish.note, energy: energyFor(wish.volume) })}
            >
              {wish.label} {wish.volume}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="Art">
            <select
              className={fieldClass}
              value={form.kind}
              onChange={(event) => setForm({ ...form, kind: event.target.value as PlanKind })}
            >
              {kinds.map((kind) => (
                <option key={kind.id} value={kind.id}>
                  {kind.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Beginn">
            <input className={fieldClass} type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
          </Field>
          <Field label="Ende">
            <input className={fieldClass} type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Lautstärke" hint="Leer wäre der Normalwert. Die Knöpfe oben setzen einen Wunsch.">
            <input
              className={fieldClass}
              inputMode="numeric"
              value={form.volume ?? ""}
              onChange={(event) => setForm({ ...form, volume: event.target.value === "" ? null : Number(event.target.value) })}
            />
          </Field>
          <Field label="Wünsche">
            <select
              className={fieldClass}
              value={form.wishesEnabled == null ? "keep" : form.wishesEnabled ? "on" : "off"}
              onChange={(event) =>
                setForm({
                  ...form,
                  wishesEnabled: event.target.value === "keep" ? null : event.target.value === "on",
                })
              }
            >
              <option value="keep">Unverändert</option>
              <option value="on">An</option>
              <option value="off">Aus</option>
            </select>
          </Field>
          <Field label="Energie">
            <select
              className={fieldClass}
              value={form.energy}
              onChange={(event) => setForm({ ...form, energy: event.target.value as PlanEnergy })}
            >
              <option value="leise">Leise</option>
              <option value="mittel">Mittel</option>
              <option value="hoch">Hoch</option>
            </select>
          </Field>
        </div>
        <Field label="Filter im Block">
          <select
            className={fieldClass}
            value={form.explicitFilter ?? "keep"}
            onChange={(event) =>
              setForm({
                ...form,
                explicitFilter: event.target.value === "keep" ? null : (event.target.value as FilterMode),
              })
            }
          >
            <option value="keep">Unverändert</option>
            <option value="allow">Alles</option>
            <option value="clean">Ohne Explicit</option>
            <option value="strict">Streng</option>
          </select>
        </Field>
        <Field label="Lautstärke-Wunsch" hint="Ein Satz, den auch das Pult sieht.">
          <input className={fieldClass} value={form.wishNote} onChange={(event) => setForm({ ...form, wishNote: event.target.value })} />
        </Field>
        <Field label="Stimmung">
          <input className={fieldClass} value={form.mood} onChange={(event) => setForm({ ...form, mood: event.target.value })} />
        </Field>
        {form.kind === "relais" ? (
          <Field label="Sender">
            <select
              className={fieldClass}
              value={form.stationId ?? 0}
              onChange={(event) => setForm({ ...form, stationId: Number(event.target.value) || null })}
            >
              <option value={0}>Keiner</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Ausführlich für den DJ" hint="Was zu tun ist, nicht nur die Lautstärke.">
          <textarea
            className="min-h-28 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            value={form.djBrief}
            onChange={(event) => setForm({ ...form, djBrief: event.target.value })}
          />
        </Field>
        <Field label="Sprechpunkte" hint="Eine Zeile pro Punkt.">
          <textarea
            className="min-h-20 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            value={form.talkPoints}
            onChange={(event) => setForm({ ...form, talkPoints: event.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {initial ? "Speichern" : "Block anlegen"}
          </Button>
          {initial ? (
            <Button type="button" variant="line" onClick={onCancel}>
              Neu statt ändern
            </Button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

function kindLabel(kind: PlanKind): string {
  return kinds.find((item) => item.id === kind)?.label ?? "Musik";
}

function energyFor(volume: number): PlanEnergy {
  if (volume <= 28) return "leise";
  if (volume >= 56) return "hoch";
  return "mittel";
}

function dayStart(): number {
  const date = new Date();
  date.setHours(7, 0, 0, 0);
  return date.getTime();
}

function localInput(plusMinutes: number): string {
  return toLocal(new Date(Date.now() + plusMinutes * 60_000).toISOString());
}

function toLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sampleIcs(): string {
  const stamp = (plusMinutes: number, minutes: number) => {
    const start = new Date(Date.now() + plusMinutes * 60_000);
    const end = new Date(start.getTime() + minutes * 60_000);
    const fmt = (date: Date) => {
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };
    return { start: fmt(start), end: fmt(end) };
  };
  const jour = stamp(20, 25);
  const town = stamp(180, 40);
  return [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    `DTSTART:${jour.start}`,
    `DTEND:${jour.end}`,
    "SUMMARY:Jour fixe Vertrieb",
    "DESCRIPTION:Bitte leise. Keine Wünsche während des Calls.",
    "UID:pulse-jour@acp",
    "END:VEVENT",
    "BEGIN:VEVENT",
    `DTSTART:${town.start}`,
    `DTEND:${town.end}`,
    "SUMMARY:Townhall",
    "DESCRIPTION:Event, etwas lauter davor, währenddessen leise.",
    "UID:pulse-townhall@acp",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
}
