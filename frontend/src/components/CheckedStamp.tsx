import { IconCheck, IconClock } from "@tabler/icons-react";
import classes from "./CheckedStamp.module.css";

interface CheckedStampProps {
  lastChecked: Date | null;
}

const day = 24 * 60 * 60 * 1000;
const staleAfter = 365 * day;

function timeAgo(when: Date): string {
  const days = Math.floor((Date.now() - when.getTime()) / day);
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (days < 7) return format.format(-days, "day");
  if (days < 30) return format.format(-Math.floor(days / 7), "week");
  if (days < 730) return format.format(-Math.floor(days / 30), "month");
  return format.format(-Math.floor(days / 365), "year");
}

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
