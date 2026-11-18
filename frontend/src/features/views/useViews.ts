import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components, operations } from "@/types/api.generated";

export type ViewSummary = components["schemas"]["ViewSummary"];
export type ViewName = ViewSummary["view"];
type ViewSummaries = components["schemas"]["Page_ViewSummary_"];
type ViewRows = operations["list_view_rows"]["responses"][200]["content"]["application/json"];
export type ViewRow = ViewRows["items"][number];

export const viewsKey = ["views"] as const;

/** Every built-in view with its count; the frame's navigation reads it on every page. */
export function useViews(fromFrame = false) {
  return useQuery({
    // The frame's navigation counts these on every page; a failure there is the page's to show.
    throwOnError: !fromFrame,
    queryKey: viewsKey,
    // Nine views fit on one page.
    queryFn: ({ signal }) => api.get<ViewSummaries>("/api/views", signal),
    select: (page) => page.items,
  });
}

/** What one built-in view lists, a page at a time. */
export function useViewRows(view: ViewName) {
  return useInfiniteQuery({
    queryKey: [...viewsKey, view],
    queryFn: ({ pageParam, signal }) => {
      const cursor = pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : "";
      return api.get<ViewRows>(`/api/views/${view}${cursor}`, signal);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
  });
}
