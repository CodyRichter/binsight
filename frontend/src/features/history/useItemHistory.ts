import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

export type HistoryEntry = components["schemas"]["HistoryEntry"];
type HistoryPage = components["schemas"]["Page_HistoryEntry_"];

export function itemHistoryKey(itemId: string) {
  return ["history", itemId] as const;
}

// The design has no "more" control, so every page is read before the list shows.
async function everyEntry(itemId: string, signal: AbortSignal) {
  const entries: HistoryEntry[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ item_id: itemId, limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page: HistoryPage = await api.get<HistoryPage>(`/api/history?${query}`, signal);
    entries.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return entries;
}

/** The changes made to one item, newest first. */
export function useItemHistory(itemId: string) {
  return useQuery({
    queryKey: itemHistoryKey(itemId),
    queryFn: ({ signal }) => everyEntry(itemId, signal),
  });
}
