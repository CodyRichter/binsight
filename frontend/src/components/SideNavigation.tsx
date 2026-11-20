import { ActionIcon } from "@mantine/core";
import {
  IconHome,
  IconInbox,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogin,
  IconSettings,
} from "@tabler/icons-react";
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
  /** Shows only the entries' icons, each named on hover by its title. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function entry({ name, to, icon: EntryIcon, count, current }: NavItem, collapsed: boolean) {
  const label = count === undefined ? name : `${name} ${count}`;
  return (
    <li key={to}>
      <Link
        className={classes.entry}
        to={to}
        aria-current={current ? "page" : undefined}
        title={collapsed ? label : undefined}
      >
        <EntryIcon aria-hidden size={20} className={classes.icon} />
        <span className={classes.name}>{name}</span>
        {count !== undefined && <span className={classes.count}>{count}</span>}
      </Link>
    </li>
  );
}

function sectionGroup(section: NavSection, collapsed: boolean) {
  const headingId = `nav-${section.id}`;
  const SectionIcon = section.icon;
  return (
    <div key={section.id} className={classes.section} role="group" aria-labelledby={headingId}>
      {section.to ? (
        <Link
          id={headingId}
          className={classes.sectionLink}
          to={section.to}
          aria-current={section.current ? "page" : undefined}
          title={collapsed ? section.title : undefined}
        >
          {SectionIcon && <SectionIcon aria-hidden size={20} className={classes.sectionIcon} />}
          <span className={classes.name}>{section.title}</span>
        </Link>
      ) : (
        <span id={headingId} className={classes.sectionTitle}>
          <span className={classes.name}>{section.title}</span>
        </span>
      )}
      {section.items.length > 0 && (
        <ul className={classes.list}>{section.items.map((item) => entry(item, collapsed))}</ul>
      )}
    </div>
  );
}

function collapseToggle({ collapsed = false, onCollapsedChange }: SideNavigationProps) {
  if (!onCollapsedChange) return null;
  const Glyph = collapsed ? IconLayoutSidebarLeftExpand : IconLayoutSidebarLeftCollapse;
  return (
    <ActionIcon
      className={classes.toggle}
      aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      onClick={() => onCollapsedChange(!collapsed)}
    >
      <Glyph aria-hidden size={20} />
    </ActionIcon>
  );
}

export function SideNavigation(props: SideNavigationProps) {
  const { current, inboxCount, sections = [], signInAt, collapsed = false } = props;
  const visibleSections = sections.filter((section) => section.items.length > 0 || section.to);
  const home = { name: "Home", to: "/", icon: IconHome, current: current === "home" };
  const inbox = { name: "Inbox", to: "/inbox", icon: IconInbox, count: inboxCount };
  const settings = { name: "Settings", to: "/settings", icon: IconSettings };
  return (
    <nav className={classes.navigation} aria-label="Main" data-collapsed={collapsed || undefined}>
      <div className={classes.brand}>
        <BrandMark />
        <span className={classes.name}>Binsight</span>
      </div>
      <div className={classes.entries}>
        <ul className={classes.list}>
          {entry(home, collapsed)}
          {!signInAt && entry({ ...inbox, current: current === "inbox" }, collapsed)}
        </ul>
        {visibleSections.map((section) => sectionGroup(section, collapsed))}
      </div>
      <div className={classes.pinned}>
        <ul className={classes.list}>
          {signInAt
            ? entry({ name: "Sign in", to: signInAt, icon: IconLogin }, collapsed)
            : entry({ ...settings, current: current === "settings" }, collapsed)}
        </ul>
        {collapseToggle(props)}
      </div>
    </nav>
  );
}
