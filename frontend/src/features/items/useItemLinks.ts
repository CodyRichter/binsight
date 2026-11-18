import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemHistoryKey, useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemName } from "./placeName";
import type { Item } from "./useItems";

type LinkedItemPage = components["schemas"]["Page_LinkedItem_"];
export type LinkedItem = LinkedItemPage["items"][number];
type LinkNew = components["schemas"]["ItemLinkNew"];
type Linked = components["schemas"]["ItemLinked"];
type Unlinked = components["schemas"]["ItemUnlinked"];
type SearchResults = components["schemas"]["SearchResults"];

const linksKey = ["item-links"] as const;

function itemLinksKey(itemId: string) {
  return [...linksKey, itemId] as const;
}

/** The items linked to one item, from its side: belongs with, part of, and its parts. */
export function useItemLinks(itemId: string, enabled: boolean) {
  return useQuery({
    queryKey: itemLinksKey(itemId),
    // An item has a handful of links, so the first page is all of them.
    queryFn: ({ signal }) =>
      api.get<LinkedItemPage>(`/api/items/${itemId}/links?limit=200`, signal),
    enabled,
  });
}

/** Items matching what is typed, for picking one to link; search can't be imported here. */
export function useItemSearch(query: string) {
  return useQuery({
    // Search's own key, so its results are refreshed together with search's.
    queryKey: ["search", "items", query],
    queryFn: ({ signal }) =>
      api.get<SearchResults>(`/api/search?${new URLSearchParams({ query })}`, signal),
    placeholderData: keepPreviousData,
    enabled: query.trim() !== "",
    select: (found) => found.results.flatMap((result) => ("item" in result ? [result.item] : [])),
  });
}

export interface NewLink {
  /** The item the link is made from: for part_of, the part. */
  from: Item;
  to: Item;
  kind: LinkNew["kind"];
}

function useRefreshLinks() {
  const queryClient = useQueryClient();
  return (...items: Item[]) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: linksKey }),
      ...items.map((item) => queryClient.invalidateQueries({ queryKey: itemHistoryKey(item.id) })),
    ]);
}

/** Links two items, saying so with Undo; a refusal says why with Retry. */
export function useLinkItems(): (link: NewLink, shownName: string) => void {
  const undo = useUndo();
  const refresh = useRefreshLinks();
  const { mutate } = useMutation({
    mutationFn: ({ link }: { link: NewLink; shownName: string }) =>
      api.post<Linked>(`/api/items/${link.from.id}/links`, {
        other_item_id: link.to.id,
        kind: link.kind,
      } satisfies LinkNew),
    onSuccess: (linked, { shownName }) =>
      showToast({ message: `Linked ${shownName}`, onUndo: () => undo(linked.history_entry_id) }),
    onError: (error, call) => showToast({ message: error.message, onRetry: () => mutate(call) }),
    onSettled: (_answer, _error, { link }) => refresh(link.from, link.to),
  });
  return (link, shownName) => mutate({ link, shownName });
}

/** Removes a link, gone from the list at once, with Undo; a refusal puts it back. */
export function useUnlink(item: Item): (linked: LinkedItem) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const refresh = useRefreshLinks();
  const key = itemLinksKey(item.id);
  const { mutate } = useMutation({
    mutationFn: (linked: LinkedItem) => api.delete<Unlinked>(`/api/item-links/${linked.link_id}`),
    onMutate: (linked) => {
      const before = queryClient.getQueryData<LinkedItemPage>(key);
      queryClient.setQueryData<LinkedItemPage>(
        key,
        (page) =>
          page && { ...page, items: page.items.filter((each) => each.link_id !== linked.link_id) },
      );
      return before;
    },
    onSuccess: (removed, linked) =>
      showToast({
        message: `Removed link to ${itemName(linked.item.name)}`,
        onUndo: () => undo(removed.history_entry_id),
      }),
    onError: (error, linked, before) => {
      queryClient.setQueryData(key, before);
      showToast({ message: error.message, onRetry: () => mutate(linked) });
    },
    onSettled: (_answer, _error, linked) => refresh(item, linked.item),
  });
  return (linked) => mutate(linked);
}
