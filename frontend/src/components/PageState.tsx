import { Button } from "@mantine/core";
import { useEffect, useState, type ReactNode } from "react";
import { EmptyState } from "./EmptyState";

interface EmptyMessage {
  statement: string;
  fact?: string;
  action?: ReactNode;
}

export type PageStatus = "ready" | "loading" | "unreachable" | "notFound" | "empty";

interface PageStateProps {
  status: PageStatus;
  standalone?: boolean;
  delayMs?: number;
  onRetry?: () => void;
  empty?: EmptyMessage;
  notFound?: EmptyMessage;
  children?: ReactNode;
}

function fallbackMessage(props: PageStateProps, timedOut: boolean): EmptyMessage | null {
  switch (props.status) {
    case "loading":
      return timedOut ? { statement: "Still loading" } : null;
    case "unreachable":
      return {
        statement: "Can't reach Binsight",
        action: props.onRetry && <Button onClick={props.onRetry}>Try again</Button>,
      };
    case "notFound":
      return props.notFound ?? null;
    case "empty":
      return props.empty ?? null;
    default:
      return null;
  }
}

export function PageState(props: PageStateProps) {
  const { status, standalone = false, delayMs = 1000, children } = props;
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status !== "loading" || delayMs <= 0) return;
    const timer = window.setTimeout(() => setTimedOut(true), delayMs);
    return () => {
      window.clearTimeout(timer);
      setTimedOut(false);
    };
  }, [status, delayMs]);

  if (status === "ready") return <>{children}</>;
  const message = fallbackMessage(props, delayMs <= 0 || timedOut);
  return message ? <EmptyState {...message} standalone={standalone} /> : null;
}
