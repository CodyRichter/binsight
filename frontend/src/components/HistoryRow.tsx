import { timeAgo } from "./timeAgo";
import classes from "./HistoryRow.module.css";

interface HistoryRowProps {
  happened: string;
  at: Date;
  /** Who made the change, as it reads after the time: "You", "Claude" or a username. */
  by: string;
}

function sentenceCase(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function HistoryRow({ happened, at, by }: HistoryRowProps) {
  return (
    <li className={classes.row}>
      <span className={classes.happened}>{happened}</span>
      <span className={classes.when}>
        {sentenceCase(timeAgo(at))} · {by}
      </span>
    </li>
  );
}
