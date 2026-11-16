import { IconHome, IconInbox, IconListDetails, IconPlus, IconSettings } from "@tabler/icons-react";
import { Link } from "react-router";
import type { Destination } from "./navigation";
import classes from "./BottomBar.module.css";

interface BottomBarProps {
  current: Destination | null;
  inboxCount: number;
  onAdd: () => void;
}

const destinations = [
  { destination: "home", name: "Home", to: "/", Icon: IconHome },
  { destination: "views", name: "Views", to: "/views", Icon: IconListDetails },
  { destination: "inbox", name: "Inbox", to: "/inbox", Icon: IconInbox },
  { destination: "settings", name: "Settings", to: "/settings", Icon: IconSettings },
] as const;

export function BottomBar({ current, inboxCount, onAdd }: BottomBarProps) {
  const links = destinations.map(({ destination, name, to, Icon }) => (
    <Link
      key={destination}
      className={classes.slot}
      to={to}
      aria-current={current === destination ? "page" : undefined}
    >
      <span className={classes.icon}>
        <Icon aria-hidden />
        {destination === "inbox" && inboxCount > 0 && <b className={classes.count}>{inboxCount}</b>}
      </span>
      {name}
    </Link>
  ));
  return (
    <nav className={classes.bar} aria-label="Main">
      {links.slice(0, 2)}
      <button type="button" className={classes.slot} data-add onClick={onAdd}>
        <span className={classes.icon}>
          <IconPlus aria-hidden />
        </span>
        Add
      </button>
      {links.slice(2)}
    </nav>
  );
}
