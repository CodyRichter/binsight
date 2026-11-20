import { useMantineTheme } from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { sizes } from "@/lib/theme/tokens";

export function useWiderThan(breakpoint: "md" | "lg"): boolean {
  const theme = useMantineTheme();
  return useMediaQuery(`(min-width: ${theme.breakpoints[breakpoint]})`, false, {
    getInitialValueInEffect: false,
  });
}

/** Whether this device keeps the side navigation collapsed to its icons. */
export function useNavCollapsed() {
  return useLocalStorage({
    key: "binsight.nav-collapsed",
    defaultValue: false,
    getInitialValueInEffect: false,
  });
}

export function shellConfig(wide: boolean, hasFooter: boolean, navCollapsed: boolean) {
  const navWidth = sizes[navCollapsed ? "nav-width-rail" : "nav-width"];
  return {
    header: { height: `calc(${sizes["bar-height"]} + env(safe-area-inset-top))` },
    navbar: wide ? { width: navWidth, breakpoint: 0 } : undefined,
    footer: hasFooter
      ? { height: `calc(${sizes["nav-height"]} + env(safe-area-inset-bottom))` }
      : undefined,
  };
}
