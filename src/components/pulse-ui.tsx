import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { brand } from "@/brand";
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
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link to="/" className="flex min-w-0 items-center gap-3 text-ink">
        <Mark className="h-8 w-8 shrink-0 text-signal" />
        <span className="truncate font-display text-xl leading-none tracking-tight">{brand.productName}</span>
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-transform duration-150 ease-out active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-signal text-signal-ink",
        variant === "line" && "border border-line bg-surface text-ink",
        variant === "ghost" && "bg-transparent text-ink",
        variant === "danger" && "border border-line text-danger",
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
    <section className={cn("min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-6", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl leading-none tracking-tight text-ink">{title}</h2>
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
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function clockLabel(now: number): string {
  return new Date(now).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Das hat nicht geklappt.";
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
