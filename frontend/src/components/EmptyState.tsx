import { Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./EmptyState.module.css";

interface EmptyStateProps {
  statement: string;
  fact?: string;
  action?: ReactNode;
  standalone?: boolean;
}

export function EmptyState({ statement, fact, action, standalone }: EmptyStateProps) {
  return (
    <div className={classes.empty}>
      {standalone ? (
        <h1 className={classes.heading} tabIndex={-1}>
          {statement}
        </h1>
      ) : (
        <Title order={2}>{statement}</Title>
      )}
      {fact && (
        <Text size="md" c="dimmed">
          {fact}
        </Text>
      )}
      {action}
    </div>
  );
}
