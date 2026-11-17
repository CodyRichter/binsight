import { IconCheck, IconClock } from "@tabler/icons-react";
import classes from "./CheckedStamp.module.css";
import { timeAgo } from "./timeAgo";

interface CheckedStampProps {
  lastChecked: Date | null;
}

const staleAfter = 365 * 24 * 60 * 60 * 1000;

export function CheckedStamp({ lastChecked }: CheckedStampProps) {
  const stale = !lastChecked || Date.now() - lastChecked.getTime() > staleAfter;
  const Icon = stale ? IconClock : IconCheck;
  return (
    <span className={classes.stamp} data-stale={stale || undefined}>
      <Icon aria-hidden size={16} />
      {lastChecked ? `Checked ${timeAgo(lastChecked)}` : "Never checked"}
    </span>
  );
}
