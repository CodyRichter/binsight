import { Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./EmptyState.module.css";

interface EmptyStateProps {
  statement: string;
  fact?: string;
  action?: ReactNode;
}

export function EmptyState({ statement, fact, action }: EmptyStateProps) {
  return (
    <div className={classes.empty}>
      <Title order={2}>{statement}</Title>
      {fact && (
        <Text size="md" c="dimmed">
          {fact}
        </Text>
      )}
      {action}
    </div>
  );
}
