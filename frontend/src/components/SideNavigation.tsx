import { IconHome, IconInbox, IconSettings, type Icon } from "@tabler/icons-react";
import { Link } from "react-router";
import type { Destination, ViewLink } from "./navigation";
import classes from "./SideNavigation.module.css";

interface SideNavigationProps {
  current: Destination | null;
  currentView?: string;
  inboxCount: number;
  views: ViewLink[];
}

interface EntryProps {
  name: string;
  to: string;
  icon: Icon;
  count?: number;
  current: boolean;
}

function entry({ name, to, icon: EntryIcon, count, current }: EntryProps) {
  return (
    <Link key={to} className={classes.entry} to={to} aria-current={current ? "page" : undefined}>
      <EntryIcon aria-hidden size={20} />
      <span className={classes.name}>{name}</span>
      {count !== undefined && <span className={classes.count}>{count}</span>}
    </Link>
  );
}

export function SideNavigation({ current, currentView, inboxCount, views }: SideNavigationProps) {
  return (
    <nav className={classes.navigation} aria-label="Main">
      <div className={classes.brand}>Binsight</div>
      {entry({ name: "Home", to: "/", icon: IconHome, current: current === "home" })}
      {entry({
        name: "Inbox",
        to: "/inbox",
        icon: IconInbox,
        count: inboxCount,
        current: current === "inbox",
      })}
      <div className={classes.label}>Views</div>
      {views.map((view) => entry({ ...view, current: view.to === currentView }))}
      <span className={classes.grow} />
      {entry({
        name: "Settings",
        to: "/settings",
        icon: IconSettings,
        current: current === "settings",
      })}
    </nav>
  );
}
