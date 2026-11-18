import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import type { Search, SearchResultsPage } from "@/features/search";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";

export type SavedSearch = components["schemas"]["SavedSearch"];
type SavedSearchPage = components["schemas"]["Page_SavedSearch_"];
type SavedSearchCreated = components["schemas"]["SavedSearchCreated"];
type SavedSearchUpdated = components["schemas"]["SavedSearchUpdated"];
type SavedSearchDeleted = components["schemas"]["SavedSearchDeleted"];
type SavedSearchChanges = components["schemas"]["SavedSearchChanges"];

export const savedSearchesKey = ["saved-searches"] as const;

/** Every saved search with its count, pinned first; one page holds as many as anyone keeps. */
export function useSavedSearches(fromFrame = false) {
  return useQuery({
    // The frame's navigation counts these on every page; a failure there is the page's to show.
    throwOnError: !fromFrame,
    queryKey: savedSearchesKey,
    queryFn: ({ signal }) => api.get<SavedSearchPage>("/api/saved-searches?limit=200", signal),
    select: (page) => page.items,
  });
}

export function useSavedSearch(id: string) {
  return useQuery({
    queryKey: [...savedSearchesKey, id],
    queryFn: ({ signal }) => api.get<SavedSearch>(`/api/saved-searches/${id}`, signal),
  });
}

/** What a saved search finds now, best first, a page at a time. */
export function useSavedSearchRows(id: string) {
  return useInfiniteQuery({
    queryKey: [...savedSearchesKey, id, "results"],
    queryFn: ({ pageParam, signal }) => {
      const cursor = pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : "";
      return api.get<SearchResultsPage>(`/api/saved-searches/${id}/results${cursor}`, signal);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
  });
}

function useSavedSearchAction<Input, Answer extends { history_entry_id: string }>(
  send: (input: Input) => Promise<Answer>,
  message: (input: Input, answer: Answer) => string,
  // A deleted search's own page may still be showing; reading it again would only say it's gone.
  onlyTheList = false,
): (input: Input) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: send,
    onSuccess: (answer, input) =>
      showToast({ message: message(input, answer), onUndo: () => undo(answer.history_entry_id) }),
    onError: (error, input) => showToast({ message: error.message, onRetry: () => mutate(input) }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: savedSearchesKey, exact: onlyTheList }),
  });
  return (input) => mutate(input);
}

/** Keeps a search under a name, with Undo. */
export function useSaveSearch(): (input: Search & { name: string }) => void {
  return useSavedSearchAction(
    (input) => api.post<SavedSearchCreated>("/api/saved-searches", input),
    (_input, saved) => `Saved ${saved.name}`,
  );
}

/** Renames a saved search, or pins or unpins it, with Undo. */
export function useChangeSavedSearch(): (input: { id: string } & SavedSearchChanges) => void {
  return useSavedSearchAction(
    ({ id, ...changes }) => api.patch<SavedSearchUpdated>(`/api/saved-searches/${id}`, changes),
    (input, saved) => {
      if (input.name) return `Renamed to ${saved.name}`;
      return saved.pinned ? `Pinned ${saved.name}` : `Unpinned ${saved.name}`;
    },
  );
}

/** Deletes a saved search, with Undo; the items it found are not touched. */
export function useDeleteSavedSearch(): (saved: SavedSearch) => void {
  return useSavedSearchAction(
    (saved) => api.delete<SavedSearchDeleted>(`/api/saved-searches/${saved.id}`),
    (saved) => `Deleted ${saved.name}`,
    true,
  );
}
