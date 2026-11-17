import { Button } from "@mantine/core";
import classes from "./DuplicateSuggestion.module.css";

interface DuplicateSuggestionProps {
  message: string;
  actionLabel?: string;
  onAccept: () => void;
}

export function DuplicateSuggestion({
  message,
  actionLabel = "Add to existing",
  onAccept,
}: DuplicateSuggestionProps) {
  return (
    <div className={classes.row}>
      <span className={classes.message}>{message}</span>
      <Button className={classes.action} variant="subtle" onClick={onAccept}>
        {actionLabel}
      </Button>
    </div>
  );
}
