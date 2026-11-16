import { AppShell, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { ReactNode } from "react";
import { sizes } from "@/lib/theme/tokens";
import { BottomBar } from "./BottomBar";
import type { Destination, ViewLink } from "./navigation";
import { SideNavigation } from "./SideNavigation";
import { TopBar } from "./TopBar";
import classes from "./Frame.module.css";

interface FrameProps {
  navigation: { current: Destination | null; currentView?: string; inboxCount: number };
  views: ViewLink[];
  actions: {
    onAdd: () => void;
    onScan: () => void;
    onSearch: (query: string) => void;
    onBack?: () => void;
  };
  children: ReactNode;
}

export function Frame({ navigation, views, actions, children }: FrameProps) {
  const theme = useMantineTheme();
  const wide = useMediaQuery(`(min-width: ${theme.breakpoints.md})`, false, {
    getInitialValueInEffect: false,
  });
  return (
    <AppShell
      className={classes.frame}
      header={{ height: sizes["bar-height"] }}
      navbar={{ width: sizes["nav-width"], breakpoint: "md", collapsed: { mobile: true } }}
      footer={{ height: sizes["nav-height"], collapsed: wide }}
    >
      <AppShell.Header>
        <TopBar wide={wide} {...actions} />
      </AppShell.Header>
      <AppShell.Navbar>
        <SideNavigation views={views} {...navigation} />
      </AppShell.Navbar>
      <AppShell.Main>
        <div className={classes.content}>{children}</div>
      </AppShell.Main>
      <AppShell.Footer>
        <BottomBar
          current={navigation.current}
          inboxCount={navigation.inboxCount}
          onAdd={actions.onAdd}
        />
      </AppShell.Footer>
    </AppShell>
  );
}
