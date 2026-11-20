import { AppShell } from "@mantine/core";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { BottomBar } from "./BottomBar";
import { ErrorBoundary } from "./ErrorBoundary";
import { shellConfig, useNavCollapsed, useWiderThan } from "./frameWidths";
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
  /** The location pane, shown beside the content from the widest arrangement. */
  pane?: ReactNode;
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

/** The location pane, only in the widest arrangement. */
function useShownPane(pane: ReactNode): ReactNode {
  return useWiderThan("lg") ? pane : undefined;
}

function PaneAside({ pane }: { pane: ReactNode }) {
  if (!pane) return null;
  return (
    <aside className={classes.pane} aria-label="Locations">
      {pane}
    </aside>
  );
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
  const wide = useWiderThan("md");
  const pane = useShownPane(props.pane);
  const [navCollapsed, setNavCollapsed] = useNavCollapsed();
  const focusSearch = useFocusSearch();
  const back = useBack(parent, props.destination);
  useTitleFocusAfterNavigating();
  const footer = !wide && <BottomBar {...navigation} onAdd={actions.onAdd} />;
  return (
    <AppShell
      className={classes.frame}
      data-frame="app"
      data-selecting={selectionBar ? true : undefined}
      data-pane={Boolean(pane) || undefined}
      layout="alt"
      transitionDuration={0}
      {...shellConfig(wide, Boolean(footer), navCollapsed)}
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
          <SideNavigation
            sections={sections}
            {...navigation}
            collapsed={navCollapsed}
            onCollapsedChange={setNavCollapsed}
          />
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
      {selectionBar && (
        <div className={classes.selection}>
          <div className={classes.column}>{selectionBar}</div>
        </div>
      )}
      <PaneAside pane={pane} />
    </AppShell>
  );
}
