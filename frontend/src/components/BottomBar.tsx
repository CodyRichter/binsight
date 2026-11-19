import { VisuallyHidden } from "@mantine/core";
import {
  IconHome,
  IconInbox,
  IconListDetails,
  IconLogin,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import { Link } from "react-router";
import type { Destination } from "./navigation";
import classes from "./BottomBar.module.css";

interface BottomBarProps {
  current: Destination | null;
  inboxCount?: number;
  onAdd?: () => void;
  /** For a visitor: where signing in is, shown in the place of Inbox and Settings. */
  signInAt?: string;
}

const destinations = [
  { destination: "home", name: "Home", to: "/", Icon: IconHome },
  { destination: "views", name: "Views", to: "/views", Icon: IconListDetails },
  { destination: "inbox", name: "Inbox", to: "/inbox", Icon: IconInbox },
  { destination: "settings", name: "Settings", to: "/settings", Icon: IconSettings },
] as const;

function shownTo(signInAt: string | undefined) {
  if (!signInAt) return destinations;
  const signIn = {
    destination: "sign-in",
    name: "Sign in",
    to: signInAt,
    Icon: IconLogin,
  } as const;
  return [destinations[0], destinations[1], signIn];
}

export function BottomBar({ current, inboxCount = 0, onAdd, signInAt }: BottomBarProps) {
  const links = shownTo(signInAt).map(({ destination, name, to, Icon }) => {
    const hasCount = destination === "inbox" && inboxCount > 0;
    return (
      <Link
        key={destination}
        className={classes.slot}
        to={to}
        aria-current={current === destination ? "page" : undefined}
      >
        <span className={classes.icon}>
          <Icon aria-hidden />
          {hasCount && (
            <b className={classes.count} aria-hidden>
              {inboxCount}
            </b>
          )}
        </span>
        {/* The count is read after the word shown, as the side navigation reads it: "Inbox 3". */}
        {hasCount ? `${name} ` : name}
        {hasCount && <VisuallyHidden component="span">{inboxCount}</VisuallyHidden>}
      </Link>
    );
  });
  return (
    <nav className={classes.bar} aria-label="Main">
      {links.slice(0, 2)}
      {onAdd && (
        <button type="button" className={classes.slot} data-add onClick={onAdd}>
          <span className={classes.icon}>
            <IconPlus aria-hidden />
          </span>
          Add
        </button>
      )}
      {links.slice(2)}
    </nav>
  );
}
