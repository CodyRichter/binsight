import { createTheme, type CSSVariablesResolver } from "@mantine/core";
import { components } from "./components";
import {
  accentScale,
  colorTokens,
  fontFamilies,
  fontSizes,
  lineHeights,
  radius,
  shadowOverlay,
  sizes,
  space,
  typeStyles,
  token,
} from "./tokens";
import { variantColorResolver } from "./variants";

const overlayShadow = "var(--bs-shadow-overlay)";

export const theme = createTheme({
  fontFamily: fontFamilies.sans,
  fontFamilyMonospace: fontFamilies.mono,
  headings: {
    fontFamily: fontFamilies.sans,
    fontWeight: "700",
    sizes: {
      h1: {
        fontSize: typeStyles["text-title"].size,
        lineHeight: typeStyles["text-title"].lineHeight,
      },
      h2: {
        fontSize: typeStyles["text-heading"].size,
        lineHeight: typeStyles["text-heading"].lineHeight,
      },
    },
  },
  fontSizes,
  lineHeights,
  spacing: space,
  radius,
  defaultRadius: "md",
  colors: { accent: accentScale },
  primaryColor: "accent",
  primaryShade: 5,
  autoContrast: true,
  shadows: {
    xs: overlayShadow,
    sm: overlayShadow,
    md: overlayShadow,
    lg: overlayShadow,
    xl: overlayShadow,
  },
  respectReducedMotion: true,
  cursorType: "pointer",
  variantColorResolver,
  components,
});

function schemeVariables(scheme: "light" | "dark"): Record<string, string> {
  const tokens = Object.entries(colorTokens).map(([name, value]) => [
    `--bs-${name}`,
    value[scheme],
  ]);
  return {
    ...Object.fromEntries(tokens),
    "--bs-shadow-overlay": shadowOverlay[scheme],
    "--mantine-color-body": token("ground"),
    "--mantine-color-text": token("ink"),
    "--mantine-color-bright": token("ink"),
    "--mantine-color-anchor": token("ink"),
    "--mantine-color-dimmed": token("muted"),
    "--mantine-color-placeholder": token("muted"),
    "--mantine-color-default": token("surface"),
    "--mantine-color-default-hover": token("hover"),
    "--mantine-color-default-color": token("ink"),
    "--mantine-color-default-border": token("control-border"),
    "--mantine-color-disabled": token("ground"),
    "--mantine-color-disabled-color": token("muted"),
    "--mantine-color-disabled-border": token("hairline"),
    "--mantine-color-error": token("danger"),
    "--mantine-primary-color-contrast": token("on-accent"),
    "--mantine-color-accent-filled": token("accent"),
    "--mantine-color-accent-filled-hover": token("accent-hover"),
  };
}

function sharedVariables(): Record<string, string> {
  const prefixed = (group: string, values: Record<string, string>) =>
    Object.entries(values).map(([name, value]) => [`--bs-${group}${name}`, value]);
  const type = Object.entries(typeStyles).flatMap(([name, style]) => [
    [`--bs-${name}-size`, style.size],
    [`--bs-${name}-line-height`, style.lineHeight],
    [`--bs-${name}-weight`, String(style.weight)],
  ]);
  return Object.fromEntries([
    ...prefixed("space-", space),
    ...prefixed("radius-", radius),
    ...prefixed("", sizes),
    ...type,
    ["--bs-font-sans", fontFamilies.sans],
    ["--bs-font-mono", fontFamilies.mono],
  ]);
}

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: sharedVariables(),
  light: schemeVariables("light"),
  dark: schemeVariables("dark"),
});
