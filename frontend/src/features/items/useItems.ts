import { keepPreviousData, useQuery, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

export type Item = components["schemas"]["Item"];
type ItemPage = components["schemas"]["Page_Item_"];

export const itemListsKey = ["items", "in"] as const;
export const inboxKey = ["items", "inbox"] as const;

/** Where new items go: a location, or the inbox when it is null. */
export interface Destination {
  id: string;
  name: string;
  path: Item["path"];
}

/** Reads every list of items again: the inbox and its count, and search results among them. */
export async function refreshItemLists(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: itemListsKey }),
    queryClient.invalidateQueries({ queryKey: inboxKey }),
    // Search results list items too; the key is the search feature's, which cannot be imported here.
    queryClient.invalidateQueries({ queryKey: ["search"] }),
  ]);
}

export function itemListKey(locationId: string, everythingInside: boolean) {
  return [...itemListsKey, locationId, everythingInside] as const;
}

export function itemKey(itemId: string) {
  return ["items", "one", itemId] as const;
}

// The design has no "more" control, so every page is read before the list shows.
async function everyItem(locationId: string, everythingInside: boolean, signal: AbortSignal) {
  const items: Item[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({
      location_id: locationId,
      everything_inside: String(everythingInside),
      limit: "200",
    });
    if (cursor) query.set("cursor", cursor);
    const page: ItemPage = await api.get<ItemPage>(`/api/items?${query}`, signal);
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
}

/** The items in a location, oldest first, or in it and every location beneath it. */
export function useLocationItems(locationId: string, everythingInside: boolean) {
  return useQuery({
    queryKey: itemListKey(locationId, everythingInside),
    queryFn: ({ signal }) => everyItem(locationId, everythingInside, signal),
    placeholderData: keepPreviousData,
  });
}

/** One item, with the path of its home location. */
export function useItem(itemId: string) {
  return useQuery({
    queryKey: itemKey(itemId),
    queryFn: ({ signal }) => api.get<Item>(`/api/items/${itemId}`, signal),
  });
}
