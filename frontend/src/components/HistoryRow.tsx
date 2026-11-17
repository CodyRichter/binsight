import { timeAgo } from "./timeAgo";
import classes from "./HistoryRow.module.css";

interface HistoryRowProps {
  happened: string;
  at: Date;
  actor: "app" | "mcp";
}

const actorNames = { app: "You", mcp: "Claude" };

function sentenceCase(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function HistoryRow({ happened, at, actor }: HistoryRowProps) {
  return (
    <li className={classes.row}>
      <span className={classes.happened}>{happened}</span>
      <span className={classes.when}>
        {sentenceCase(timeAgo(at))} · {actorNames[actor]}
      </span>
    </li>
  );
}
