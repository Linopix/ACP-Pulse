/**
 * ACP Pulse — Corporate Identity
 * --------------------------------
 * Das ist die eine Stelle für Namen und Firmenfarben.
 * Werte ändern, speichern, fertig. Die Oberfläche liest nur diese Datei.
 *
 * Farben als Hex mit #. Schriften als vollständige CSS-font-family-Angabe.
 */
export const brand = {
  productName: "ACP Pulse",
  productShort: "ACPulse",
  companyName: "ACP",
  tagline: "Das Radio fürs Team",
  colors: {
    /** Seitenhintergrund */
    canvas: "#0e1211",
    /** Karten */
    surface: "#161c1a",
    /** Felder, verschachtelte Flächen */
    surface2: "#1e2724",
    /** Text */
    ink: "#f3f6f4",
    /** Sekundärtext */
    muted: "#9aaba4",
    /** Meta, Placeholder */
    subtle: "#6e7f78",
    /** Linien */
    line: "#2c3834",
    /** Eine Akzentfarbe — Signal */
    signal: "#2f9d86",
    /** Text auf der Akzentfarbe */
    signalInk: "#06211c",
    /** Nur kleine Statusmarken */
    danger: "#c45c4e",
    ok: "#6eae86",
  },
  fonts: {
    display: '"Fraunces", "Iowan Old Style", Georgia, serif',
    sans: '"Outfit", "Segoe UI", system-ui, sans-serif',
  },
  radius: {
    /** Innere Controls */
    sm: "8px",
    md: "12px",
    lg: "16px",
    /** Karten mit 16px Innenabstand: 12 + 16 */
    xl: "28px",
  },
} as const;

/** Schreibt die Marke als CSS-Variablen. Nicht duplizieren. */
export function brandCss(signalOverride?: string): string {
  const c = brand.colors;
  const r = brand.radius;
  const signal = signalHex(signalOverride ?? "") ?? c.signal;
  return `:root{
    --brand-canvas:${c.canvas};
    --brand-surface:${c.surface};
    --brand-surface-2:${c.surface2};
    --brand-ink:${c.ink};
    --brand-muted:${c.muted};
    --brand-subtle:${c.subtle};
    --brand-line:${c.line};
    --brand-signal:${signal};
    --brand-signal-ink:${signalInk(signal)};
    --brand-danger:${c.danger};
    --brand-ok:${c.ok};
    --brand-font-display:${brand.fonts.display};
    --brand-font-sans:${brand.fonts.sans};
    --brand-radius-sm:${r.sm};
    --brand-radius-md:${r.md};
    --brand-radius-lg:${r.lg};
    --brand-radius-xl:${r.xl};
  }`;
}

/** Nur #rrggbb. Alles andere ist keine Signalfarbe. */
export function signalHex(value: string): string | null {
  const hex = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null;
}

/** Dunkle Schrift auf hellem Signal, helle Schrift auf dunklem. */
export function signalInk(signal: string): string {
  const hex = signalHex(signal) ?? brand.colors.signal;
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return y > 0.45 ? "#06211c" : "#f3f6f4";
}
