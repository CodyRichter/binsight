import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";
import { filterNames, hasFilters, type Search } from "./searchState";

export type SearchResults = components["schemas"]["SearchResults"];
export type SearchResult = SearchResults["results"][number];

const searchKey = ["search"] as const;

function searchParams(search: Search, cursor: string | null): URLSearchParams {
  const params = new URLSearchParams({ query: search.query });
  for (const name of filterNames) {
    const value = search[name];
    if (value) params.set(name, value);
  }
  if (cursor) params.set("cursor", cursor);
  return params;
}

/** What a search finds across the home, best first, a page at a time, as it is typed. */
export function useSearchResults(search: Search) {
  return useInfiniteQuery({
    queryKey: [...searchKey, search],
    queryFn: ({ pageParam, signal }) =>
      api.get<SearchResults>(`/api/search?${searchParams(search, pageParam)}`, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    // The last results stay on screen while the next keystroke's arrive.
    placeholderData: keepPreviousData,
    enabled: search.query !== "" || hasFilters(search),
  });
}
