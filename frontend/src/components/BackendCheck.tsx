import type { ReactNode } from "react";
import { useHealth } from "@/lib/api/useHealth";
import { PageState, type PageStatus } from "./PageState";

function statusOf(health: ReturnType<typeof useHealth>): PageStatus {
  if (health.isPending) return "loading";
  // Only a network failure reaches here; any other error is thrown to the frame's boundary.
  if (health.isError) return "unreachable";
  return "ready";
}

export function BackendCheck({ children }: { children: ReactNode }) {
  const health = useHealth();
  return (
    <PageState status={statusOf(health)} onRetry={() => void health.refetch()}>
      {children}
    </PageState>
  );
}
