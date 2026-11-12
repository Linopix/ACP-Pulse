/** Gemeinsame Flächen. Farben und Schriften kommen aus brand.ts, nicht von hier. */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveBrand } from "@/components/pulse-brand";
import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="2.4" fill="currentColor" />
      <path
        d="M8.5 16c2-3.4 4-3.4 7.5 0s5.5 3.4 7.5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4.5 16c2.8-6 5.6-6 11.5 0s8.7 6 11.5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

export function TopBar({ children }: { children?: ReactNode }) {
  const live = useLiveBrand();
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link to="/" className="flex min-w-0 items-center gap-3 text-ink">
        <Mark className="h-8 w-8 shrink-0 text-signal" />
        <span className="truncate font-display text-xl leading-none tracking-tight">{live.productName}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">{children}</div>
    </header>
  );
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "line" | "ghost" | "danger";
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition duration-150 ease-out active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        variant === "primary" && "bg-signal text-signal-ink hover:brightness-110",
        variant === "line" && "border border-line bg-surface text-ink hover:border-signal hover:bg-surface-2",
        variant === "ghost" && "bg-transparent text-muted hover:bg-surface-2 hover:text-ink",
        variant === "danger" && "border border-line text-danger hover:border-danger hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export const fieldClass =
  "h-11 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-ink outline-none placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-5 text-subtle">{hint}</span> : null}
    </label>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rise min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-6", className)}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function clockLabel(now: number): string {
  return new Date(now).toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Das hat nicht geklappt.";
}

export function ArtThumb({ url, title }: { url?: string; title: string }) {
  if (url) {
    return <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-md bg-canvas object-cover" />;
  }
  const mark = title.trim().charAt(0).toUpperCase() || "·";
  return (
    <span
      aria-hidden="true"
      className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-canvas font-display text-lg text-subtle"
    >
      {mark}
    </span>
  );
}

export function Segment<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { id: T; label: string }[];
  label: string;
}) {
  const columns =
    options.length <= 1 ? "grid-cols-1" : options.length === 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div role="group" aria-label={label} className={cn("grid gap-1 rounded-lg bg-surface-2 p-1", columns)}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 min-w-0 rounded-md px-2 py-2 text-center text-sm font-medium leading-tight transition-colors duration-150",
              active ? "bg-signal text-signal-ink" : "text-muted hover:bg-canvas hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Eq({ live }: { live: boolean }) {
  const bars = ["h-2", "h-4", "h-3", "h-5"];
  return (
    <span className="flex h-5 items-end gap-1" aria-hidden="true">
      {bars.map((height, index) => (
        <span
          key={index}
          className={cn("w-1 rounded-sm bg-signal", height, live && "eq-bar")}
          style={live ? { animationDelay: `${index * 120}ms` } : undefined}
        />
      ))}
    </span>
  );
}
