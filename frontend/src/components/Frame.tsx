import { AppShell, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { sizes } from "@/lib/theme/tokens";
import { BottomBar } from "./BottomBar";
import type { Destination, ViewLink } from "./navigation";
import { SideNavigation } from "./SideNavigation";
import { TopBar } from "./TopBar";
import classes from "./Frame.module.css";

interface FrameProps {
  navigation: { current: Destination | null; currentView?: string; inboxCount: number };
  views: ViewLink[];
  search: { query: string; onChange: (query: string) => void };
  actions: { onAdd: () => void; onScan: () => void };
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

function useTitleFocusAfterNavigating() {
  const { key } = useLocation();
  useEffect(() => {
    const typing = document.activeElement?.matches("input, textarea");
    if (key !== "default" && !typing) document.querySelector<HTMLElement>("#content h1")?.focus();
  }, [key]);
}

export function Frame(props: FrameProps) {
  const { navigation, views, search, actions, parent = "/", selectionBar, children } = props;
  const theme = useMantineTheme();
  const wide = useMediaQuery(`(min-width: ${theme.breakpoints.md})`, false, {
    getInitialValueInEffect: false,
  });
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
      header={{ height: `calc(${sizes["bar-height"]} + env(safe-area-inset-top))` }}
      navbar={wide ? { width: sizes["nav-width"], breakpoint: 0 } : undefined}
      footer={
        footer
          ? { height: `calc(${sizes["nav-height"]} + env(safe-area-inset-bottom))` }
          : undefined
      }
    >
      <a className={classes.skip} href="#content">
        Skip to content
      </a>
      <AppShell.Header className={classes.header}>
        <div className={classes.column}>
          <TopBar wide={wide} onBack={wide ? undefined : back} search={search} {...actions} />
        </div>
      </AppShell.Header>
      {wide && (
        <AppShell.Navbar>
          <SideNavigation views={views} {...navigation} />
        </AppShell.Navbar>
      )}
      <AppShell.Main id="content" tabIndex={-1} className={classes.main}>
        <div className={classes.column}>{children}</div>
      </AppShell.Main>
      {footer && (
        <AppShell.Footer className={classes.footer}>
          <div className={classes.column}>{footer}</div>
        </AppShell.Footer>
      )}
    </AppShell>
  );
}
