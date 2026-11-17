import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";
import { inboxKey } from "./useItems";

type ItemPage = components["schemas"]["Page_Item_"];
type InboxCount = components["schemas"]["InboxCount"];

const inboxListKey = [...inboxKey, "list"] as const;
const inboxCountKey = [...inboxKey, "count"] as const;

/** The items missing a name or a home location, oldest first, a page at a time. */
export function useInbox() {
  return useInfiniteQuery({
    queryKey: inboxListKey,
    queryFn: ({ pageParam, signal }) => {
      const query = new URLSearchParams(pageParam ? { cursor: pageParam } : {});
      return api.get<ItemPage>(`/api/items/inbox?${query}`, signal);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
  });
}

/** How many items are in the inbox, for the navigation's badge. */
export function useInboxCount(): number | undefined {
  const count = useQuery({
    queryKey: inboxCountKey,
    queryFn: ({ signal }) => api.get<InboxCount>("/api/items/inbox/count", signal),
    // The badge is extra to every page; a failure there is the page's to show, not the frame's.
    throwOnError: false,
  });
  return count.data?.count;
}
