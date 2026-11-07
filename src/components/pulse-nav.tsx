/** Eine Menüführung für alle Räume. Kanalnummern, keine wechselnden Textlinks. */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { isDesk, type DeskRole } from "@/lib/pulse/logic";
import { GuideButton } from "@/components/pulse-guide";
import { Mark, clockLabel } from "@/components/pulse-ui";
import { brand } from "@/brand";
import { cn } from "@/lib/utils";

export type RoomId = "sendung" | "pult" | "regie";

const rooms: { id: RoomId; no: string; label: string; to: "/" | "/dj" | "/admin" }[] = [
  { id: "sendung", no: "01", label: "Sendung", to: "/" },
  { id: "pult", no: "02", label: "Pult", to: "/dj" },
  { id: "regie", no: "03", label: "Regie", to: "/admin" },
];

function roomOpen(id: RoomId, role: DeskRole | null): boolean {
  if (id === "sendung") return true;
  if (id === "pult") return role !== null && isDesk(role);
  return role === "admin";
}

export function StudioChrome({
  room,
  role,
  wide = false,
}: {
  room: RoomId;
  role: DeskRole | null;
  wide?: boolean;
}) {
  const clock = useClock();
  const open = rooms.filter((item) => item.id === room || roomOpen(item.id, role));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className={cn("mx-auto w-full px-4 sm:px-6", wide ? "max-w-6xl" : "max-w-5xl")}>
        <div className="flex h-14 items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 text-ink">
            <Mark className="h-7 w-7 shrink-0 text-signal" />
            <span className="truncate font-display text-lg leading-none tracking-tight">{brand.productName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden px-2 text-sm tabular-nums text-muted sm:inline">{clock}</span>
            <GuideButton />
            <UserButton />
          </div>
        </div>
        {open.length > 1 ? (
          <nav aria-label="Räume" className="flex">
            {open.map((item) => {
              const active = item.id === room;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "studio-nav flex min-h-11 min-w-0 flex-1 flex-col justify-end sm:flex-none sm:px-1",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  <span className="flex items-baseline gap-2 px-1 pb-2">
                    <span
                      className={cn(
                        "font-display text-sm tabular-nums",
                        active ? "text-signal" : "text-subtle",
                      )}
                    >
                      {item.no}
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </span>
                  <span className={cn("h-0.5 rounded-sm", active ? "bg-signal" : "bg-transparent")} />
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </header>
  );
}

export type RegieSection =
  | "ausgabe"
  | "programm"
  | "musikplan"
  | "kalender"
  | "dienste"
  | "sender"
  | "playlists"
  | "moderation"
  | "nutzer";

const regieGroups: { id: string; label: string; items: { id: RegieSection; no: string; label: string }[] }[] = [
  {
    id: "ton",
    label: "Ton",
    items: [
      { id: "ausgabe", no: "01", label: "Ausgabe" },
      { id: "programm", no: "02", label: "Programm" },
    ],
  },
  {
    id: "tag",
    label: "Tag",
    items: [
      { id: "musikplan", no: "03", label: "Musikplan" },
      { id: "kalender", no: "04", label: "Kalender" },
    ],
  },
  {
    id: "quellen",
    label: "Quellen",
    items: [
      { id: "dienste", no: "05", label: "Dienste" },
      { id: "sender", no: "06", label: "Sender" },
      { id: "playlists", no: "07", label: "Playlists" },
    ],
  },
  {
    id: "haus",
    label: "Haus",
    items: [
      { id: "moderation", no: "08", label: "Moderation" },
      { id: "nutzer", no: "09", label: "Nutzer" },
    ],
  },
];

export function RegieBoard({
  section,
  onChange,
}: {
  section: RegieSection;
  onChange: (section: RegieSection) => void;
}) {
  const group = regieGroups.find((item) => item.items.some((entry) => entry.id === section)) ?? regieGroups[0]!;

  return (
    <nav aria-label="Regie">
      <div className="grid grid-cols-4 sm:hidden">
        {regieGroups.map((item) => {
          const active = item.id === group.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.items[0]!.id)}
              className={cn(
                "studio-nav flex h-11 flex-col justify-end text-sm",
                active ? "text-ink" : "text-muted",
              )}
            >
              <span className="pb-2">{item.label}</span>
              <span className={cn("h-0.5 rounded-sm", active ? "bg-signal" : "bg-transparent")} />
            </button>
          );
        })}
      </div>
      <ul className="grid gap-1 pt-2 sm:hidden">
        {group.items.map((item) => (
          <li key={item.id}>
            <ChannelButton item={item} active={item.id === section} onChange={onChange} />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-xl border border-line bg-line sm:grid sm:grid-cols-4 sm:gap-px">
        {regieGroups.map((item) => (
          <div key={item.id} className="bg-surface px-2 py-3">
            <p className="px-2 pb-1 text-xs tracking-widest text-subtle uppercase">{item.label}</p>
            <ul className="grid">
              {item.items.map((entry) => (
                <li key={entry.id}>
                  <ChannelButton item={entry} active={entry.id === section} onChange={onChange} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

function ChannelButton({
  item,
  active,
  onChange,
}: {
  item: { id: RegieSection; no: string; label: string };
  active: boolean;
  onChange: (section: RegieSection) => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onChange(item.id)}
      className={cn(
        "studio-nav flex h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm",
        active ? "bg-surface-2 text-ink" : "text-muted",
      )}
    >
      <span className={cn("w-6 font-display text-base tabular-nums", active ? "text-signal" : "text-subtle")}>
        {item.no}
      </span>
      {item.label}
    </button>
  );
}

const pultCues = [
  { id: "laufplan", no: "01", label: "Laufplan" },
  { id: "stimme", no: "02", label: "Stimme" },
  { id: "mikro", no: "03", label: "Mikrofon" },
  { id: "band", no: "04", label: "Aufnahmen" },
  { id: "sender", no: "05", label: "Sender" },
  { id: "kennung", no: "06", label: "Kennung" },
] as const;

export function CueRail() {
  const [current, setCurrent] = useState<string>(pultCues[0].id);

  useEffect(() => {
    const nodes = pultCues
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit?.target.id) setCurrent(hit.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.15, 0.4] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Pult" className="grid grid-cols-2 gap-1 sm:grid-cols-6">
      {pultCues.map((item) => {
        const active = item.id === current;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              const node = document.getElementById(item.id);
              if (!node) return;
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
              setCurrent(item.id);
            }}
            className={cn(
              "studio-nav flex h-11 items-center gap-2 rounded-md px-2 text-sm",
              active ? "bg-surface-2 text-ink" : "text-muted",
            )}
          >
            <span className={cn("font-display text-sm tabular-nums", active ? "text-signal" : "text-subtle")}>
              {item.no}
            </span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export function CueTarget({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-36">
      {children}
    </div>
  );
}

function useClock(): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return clockLabel(now);
}
