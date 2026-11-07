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
export function brandCss(): string {
  const c = brand.colors;
  const r = brand.radius;
  return `:root{
    --brand-canvas:${c.canvas};
    --brand-surface:${c.surface};
    --brand-surface-2:${c.surface2};
    --brand-ink:${c.ink};
    --brand-muted:${c.muted};
    --brand-subtle:${c.subtle};
    --brand-line:${c.line};
    --brand-signal:${c.signal};
    --brand-signal-ink:${c.signalInk};
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
