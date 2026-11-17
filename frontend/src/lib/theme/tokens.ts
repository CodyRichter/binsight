export const colorTokens = {
  ground: { light: "#eef0f1", dark: "#111315" },
  surface: { light: "#ffffff", dark: "#1b1e21" },
  hover: { light: "#e1e5e8", dark: "#262a2e" },
  ink: { light: "#14171a", dark: "#eef0f1" },
  muted: { light: "#55606a", dark: "#a3acb4" },
  hairline: { light: "#cfd4d8", dark: "#30353a" },
  "control-border": { light: "#7c8791", dark: "#6b757e" },
  accent: { light: "#ffd21f", dark: "#ffd21f" },
  "accent-hover": { light: "#f2c200", dark: "#ffdd55" },
  "accent-edge": { light: "#14171a", dark: "#ffd21f" },
  "on-accent": { light: "#14171a", dark: "#14171a" },
  highlight: { light: "#fff1a8", dark: "#4d4200" },
  focus: { light: "#14171a", dark: "#ffd21f" },
  inverse: { light: "#14171a", dark: "#2c3136" },
  "on-inverse": { light: "#f2f4f5", dark: "#f2f4f5" },
  label: { light: "#ffffff", dark: "#e9ebe6" },
  "on-label": { light: "#14171a", dark: "#14171a" },
  danger: { light: "#b3261e", dark: "#ff8a80" },
  "on-danger": { light: "#ffffff", dark: "#14171a" },
  lent: { light: "#1f5fbf", dark: "#8ab4ff" },
  stale: { light: "#8a5a00", dark: "#e3a857" },
  scrim: { light: "rgba(20,23,26,0.45)", dark: "rgba(0,0,0,0.6)" },
} as const;

export type ColorToken = keyof typeof colorTokens;

export const shadowOverlay = {
  light: "0 8px 24px rgba(20,23,26,0.18)",
  dark: "0 8px 24px rgba(0,0,0,0.5)",
} as const;

// Shades 5 and 6 are accent and accent-hover; the rest only fill out the scale Mantine requires.
export const accentScale = [
  "#fffbe0",
  "#fff4b8",
  "#ffec8a",
  "#ffe35c",
  "#ffda38",
  "#ffd21f",
  "#f2c200",
  "#c9a100",
  "#a08000",
  "#786000",
] as const;

export const fontFamilies = {
  sans: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif",
  mono: "'Atkinson Hyperlegible Mono Variable', ui-monospace, monospace",
} as const;

export const typeStyles = {
  "text-title": { size: "1.5rem", lineHeight: "1.75rem", weight: 700 },
  "text-heading": { size: "1.125rem", lineHeight: "1.5rem", weight: 700 },
  "text-body-strong": { size: "1rem", lineHeight: "1.5rem", weight: 650 },
  "text-body": { size: "1rem", lineHeight: "1.5rem", weight: 400 },
  "text-small": { size: "0.875rem", lineHeight: "1.25rem", weight: 400 },
  "text-nav": { size: "0.875rem", lineHeight: "1rem", weight: 500 },
  code: { size: "0.875rem", lineHeight: "1.25rem", weight: 700 },
  "code-lg": { size: "1.375rem", lineHeight: "2rem", weight: 700 },
} as const;

export const space = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const;

export const radius = { sm: "2px", md: "6px", lg: "12px" } as const;

export const sizes = {
  "touch-min": "48px",
  "row-min": "64px",
  "bar-height": "56px",
  "nav-height": "64px",
  "content-max": "720px",
  "nav-width": "264px",
  "gate-width": "360px",
} as const;

// Mantine requires an xs size; it matches sm so that no text is smaller than 14px.
export const fontSizes = {
  xs: typeStyles["text-small"].size,
  sm: typeStyles["text-small"].size,
  md: typeStyles["text-body"].size,
  lg: typeStyles["text-heading"].size,
  xl: typeStyles["text-title"].size,
} as const;

export const lineHeights = {
  xs: typeStyles["text-small"].lineHeight,
  sm: typeStyles["text-small"].lineHeight,
  md: typeStyles["text-body"].lineHeight,
  lg: typeStyles["text-heading"].lineHeight,
  xl: typeStyles["text-title"].lineHeight,
} as const;

export function token(name: ColorToken): string {
  return `var(--bs-${name})`;
}
