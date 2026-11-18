import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { itemHistoryKey, useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemName, placeName } from "./placeName";
import { itemKey, refreshItemLists, type Destination, type Item } from "./useItems";

type ItemMarked = components["schemas"]["ItemMarkedMissing"];
type ItemFound = components["schemas"]["ItemFound"];

function refreshItem(queryClient: QueryClient, item: Item) {
  return Promise.all([
    refreshItemLists(queryClient),
    queryClient.invalidateQueries({ queryKey: itemKey(item.id) }),
    queryClient.invalidateQueries({ queryKey: itemHistoryKey(item.id) }),
  ]);
}

/** Marks an item missing, on screen at once, with Undo; a refusal puts it back. */
export function useMarkMissing(): (item: Item) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (item: Item) => api.post<ItemMarked>(`/api/items/${item.id}/mark-missing`),
    onMutate: (item) =>
      queryClient.setQueryData(itemKey(item.id), {
        ...item,
        status: "missing",
        lent_to: null,
        lent_at: null,
      }),
    onSuccess: (marked) =>
      showToast({
        message: `Marked ${itemName(marked.name)} missing`,
        onUndo: () => undo(marked.history_entry_id),
      }),
    onError: (error, item) => {
      queryClient.setQueryData(itemKey(item.id), item);
      showToast({ message: error.message, onRetry: () => mutate(item) });
    },
    onSettled: (_answer, _error, item) => refreshItem(queryClient, item),
  });
  return (item) => mutate(item);
}

interface Found {
  item: Item;
  place: Destination;
}

/** Marks a missing item found where it turned up, on screen at once, with Undo. */
export function useMarkFound(): (item: Item, place: Destination) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: ({ item, place }: Found) =>
      api.post<ItemMarked>(`/api/items/${item.id}/mark-found`, {
        location_id: place.id,
      } satisfies ItemFound),
    onMutate: ({ item, place }) =>
      queryClient.setQueryData(itemKey(item.id), {
        ...item,
        status: "in_place",
        home_location_id: place.id,
        path: place.path,
      }),
    onSuccess: (found, { place }) =>
      showToast({
        message: `Found ${itemName(found.name)} in ${placeName(place)}`,
        onUndo: () => undo(found.history_entry_id),
      }),
    onError: (error, found) => {
      queryClient.setQueryData(itemKey(found.item.id), found.item);
      showToast({ message: error.message, onRetry: () => mutate(found) });
    },
    onSettled: (_answer, _error, { item }) =>
      Promise.all([
        refreshItem(queryClient, item),
        // Counts move with the item; the key is the locations feature's, which cannot be imported here.
        queryClient.invalidateQueries({ queryKey: ["locations"] }),
      ]),
  });
  return (item, place) => mutate({ item, place });
}
