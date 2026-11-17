import type { UseQueryResult } from "@tanstack/react-query";
import type { PageStatus } from "@/components/PageState";

/** Says which page state a query's progress calls for. */
export function pageStatusOf(query: UseQueryResult): PageStatus {
  if (query.isPending) return "loading";
  // Only a network failure reaches here; any other error is thrown to the frame's boundary.
  if (query.isError) return "unreachable";
  return "ready";
}
