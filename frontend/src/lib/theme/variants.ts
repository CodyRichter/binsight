import {
  defaultVariantColorsResolver,
  type VariantColorResolverResult,
  type VariantColorsResolver,
} from "@mantine/core";
import { token } from "./tokens";

const controlBorder = (color: string) => `1.5px solid ${color}`;

const buttonKinds: Record<string, VariantColorResolverResult> = {
  primary: {
    background: token("accent"),
    hover: token("accent-hover"),
    color: token("on-accent"),
    border: controlBorder(token("accent-edge")),
  },
  default: {
    background: token("surface"),
    hover: token("hover"),
    color: token("ink"),
    border: controlBorder(token("control-border")),
  },
  subtle: {
    background: "transparent",
    hover: token("hover"),
    color: token("ink"),
    border: controlBorder("transparent"),
  },
  danger: {
    background: token("danger"),
    hover: token("danger"),
    color: token("on-danger"),
    border: controlBorder(token("danger")),
  },
};

// Menu.Item resolves its color through the "light" variant; only the destructive row uses one.
const dangerMenuItem: VariantColorResolverResult = {
  background: "transparent",
  hover: token("hover"),
  color: token("danger"),
  border: "none",
};

export const variantColorResolver: VariantColorsResolver = (input) => {
  if (input.color === "danger") return dangerMenuItem;
  return buttonKinds[input.variant] ?? defaultVariantColorsResolver(input);
};
