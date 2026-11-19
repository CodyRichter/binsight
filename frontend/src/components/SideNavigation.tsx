import { IconHome, IconInbox, IconLogin, IconSettings } from "@tabler/icons-react";
import { Link } from "react-router";
import { BrandMark } from "./BrandMark";
import type { Destination, NavItem, NavSection } from "./navigation";
import classes from "./SideNavigation.module.css";

interface SideNavigationProps {
  current: Destination | null;
  inboxCount?: number;
  sections?: NavSection[];
  /** For a visitor: where signing in is, shown in the place of Inbox and Settings. */
  signInAt?: string;
}

function entry({ name, to, icon: EntryIcon, count, current }: NavItem) {
  return (
    <li key={to}>
      <Link className={classes.entry} to={to} aria-current={current ? "page" : undefined}>
        <EntryIcon aria-hidden size={20} className={classes.icon} />
        <span className={classes.name}>{name}</span>
        {count !== undefined && <span className={classes.count}>{count}</span>}
      </Link>
    </li>
  );
}

function sectionGroup(section: NavSection) {
  const headingId = `nav-${section.id}`;
  return (
    <div key={section.id} className={classes.section} role="group" aria-labelledby={headingId}>
      {section.to ? (
        <Link
          id={headingId}
          className={classes.sectionLink}
          to={section.to}
          aria-current={section.current ? "page" : undefined}
        >
          {section.title}
        </Link>
      ) : (
        <span id={headingId} className={classes.sectionTitle}>
          {section.title}
        </span>
      )}
      {section.items.length > 0 && <ul className={classes.list}>{section.items.map(entry)}</ul>}
    </div>
  );
}

export function SideNavigation(props: SideNavigationProps) {
  const { current, inboxCount, sections = [], signInAt } = props;
  const visibleSections = sections.filter((section) => section.items.length > 0 || section.to);
  return (
    <nav className={classes.navigation} aria-label="Main">
      <div className={classes.brand}>
        <BrandMark />
        <span>Binsight</span>
      </div>
      <div className={classes.entries}>
        <ul className={classes.list}>
          {entry({ name: "Home", to: "/", icon: IconHome, current: current === "home" })}
          {!signInAt &&
            entry({
              name: "Inbox",
              to: "/inbox",
              icon: IconInbox,
              count: inboxCount,
              current: current === "inbox",
            })}
        </ul>
        {visibleSections.map(sectionGroup)}
      </div>
      <div className={classes.pinned}>
        <ul className={classes.list}>
          {signInAt
            ? entry({ name: "Sign in", to: signInAt, icon: IconLogin })
            : entry({
                name: "Settings",
                to: "/settings",
                icon: IconSettings,
                current: current === "settings",
              })}
        </ul>
      </div>
    </nav>
  );
}
