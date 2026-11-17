import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

export type SearchResults = components["schemas"]["SearchResults"];
export type SearchResult = SearchResults["results"][number];

const searchKey = ["search"] as const;

/** What a query finds across the home, best first, a page at a time, as it is typed. */
export function useSearchResults(query: string) {
  return useInfiniteQuery({
    queryKey: [...searchKey, query],
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ q: query, ...(pageParam && { cursor: pageParam }) });
      return api.get<SearchResults>(`/api/search?${params}`, signal);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    // The last results stay on screen while the next keystroke's arrive.
    placeholderData: keepPreviousData,
    enabled: query.trim() !== "",
  });
}
