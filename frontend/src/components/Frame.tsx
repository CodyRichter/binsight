import { AppShell, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { sizes } from "@/lib/theme/tokens";
import { BottomBar } from "./BottomBar";
import { ErrorBoundary } from "./ErrorBoundary";
import type { Destination, NavSection } from "./navigation";
import { SideNavigation } from "./SideNavigation";
import { TopBar } from "./TopBar";
import { useTitleFocusAfterNavigating } from "./useTitleFocusAfterNavigating";
import classes from "./Frame.module.css";

interface FrameProps {
  navigation: { current: Destination | null; inboxCount?: number; signInAt?: string };
  sections?: NavSection[];
  search: { query: string; onChange: (query: string) => void };
  actions?: { onAdd?: () => void; onScan?: () => void };
  parent?: string;
  destination?: boolean;
  selectionBar?: ReactNode;
  children: ReactNode;
}

function useBack(parent: string, destination?: boolean): (() => void) | undefined {
  const location = useLocation();
  const navigate = useNavigate();
  if (destination) return undefined;
  // The first page of a visit, such as one opened by a scan, has no previous page in the app.
  if (location.key === "default") return () => navigate(parent, { replace: true });
  return () => navigate(-1);
}

function useFocusSearch(): boolean {
  const { state } = useLocation();
  return Boolean((state as { focusSearch?: boolean } | null)?.focusSearch);
}

function useWide(): boolean {
  const theme = useMantineTheme();
  return useMediaQuery(`(min-width: ${theme.breakpoints.md})`, false, {
    getInitialValueInEffect: false,
  });
}

function shellConfig(wide: boolean, hasFooter: boolean) {
  return {
    header: { height: `calc(${sizes["bar-height"]} + env(safe-area-inset-top))` },
    navbar: wide ? { width: sizes["nav-width"], breakpoint: 0 } : undefined,
    footer: hasFooter
      ? { height: `calc(${sizes["nav-height"]} + env(safe-area-inset-bottom))` }
      : undefined,
  };
}

export function Frame(props: FrameProps) {
  const {
    navigation,
    sections,
    search,
    actions = {},
    parent = "/",
    selectionBar,
    children,
  } = props;
  const location = useLocation();
  const navigate = useNavigate();
  const wide = useWide();
  const focusSearch = useFocusSearch();
  const back = useBack(parent, props.destination);
  useTitleFocusAfterNavigating();
  const footer = selectionBar ?? (!wide && <BottomBar {...navigation} onAdd={actions.onAdd} />);
  return (
    <AppShell
      className={classes.frame}
      data-frame="app"
      data-selecting={selectionBar ? true : undefined}
      layout="alt"
      transitionDuration={0}
      {...shellConfig(wide, Boolean(footer))}
    >
      <a className={classes.skip} href="#content">
        Skip to content
      </a>
      <AppShell.Header className={classes.header}>
        <div className={classes.column}>
          <TopBar
            wide={wide}
            onBack={wide ? undefined : back}
            search={search}
            autoFocusSearch={focusSearch}
            {...actions}
          />
        </div>
      </AppShell.Header>
      {wide && (
        <AppShell.Navbar>
          <SideNavigation sections={sections} {...navigation} />
        </AppShell.Navbar>
      )}
      <AppShell.Main id="content" tabIndex={-1} className={classes.main}>
        <div className={classes.column}>
          <ErrorBoundary
            resetKey={`${location.pathname}${location.search}`}
            onGoHome={() => navigate(parent)}
            onScan={actions.onScan}
          >
            {children}
          </ErrorBoundary>
        </div>
      </AppShell.Main>
      {footer && (
        <AppShell.Footer className={classes.footer}>
          <div className={classes.column}>{footer}</div>
        </AppShell.Footer>
      )}
    </AppShell>
  );
}
