import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { itemHistoryKey, useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { placeName } from "./placeName";
import { itemKey, itemListKey, refreshItemLists, type Destination, type Item } from "./useItems";

type ItemMove = components["schemas"]["ItemMove"];
type ItemMoved = components["schemas"]["ItemMoved"];

interface Move {
  item: Item;
  place: Destination;
}

/** Takes the item out of its old location's list and gives it its new path, before the answer. */
function showMoved(queryClient: QueryClient, { item, place }: Move) {
  const listKey = itemListKey(item.home_location_id ?? "", false);
  const before = { list: queryClient.getQueryData<Item[]>(listKey), item };
  queryClient.setQueryData<Item[]>(listKey, (items) =>
    items?.filter((each) => each.id !== item.id),
  );
  queryClient.setQueryData<Item>(
    itemKey(item.id),
    (shown) => shown && { ...shown, home_location_id: place.id, path: place.path },
  );
  return () => {
    queryClient.setQueryData(listKey, before.list);
    queryClient.setQueryData(itemKey(item.id), before.item);
  };
}

/** Moves an item, on screen at once, with Undo; a refusal puts it back where it was. */
export function useMoveItem(): (item: Item, place: Destination) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: ({ item, place }: Move) =>
      api.post<ItemMoved>(`/api/items/${item.id}/move`, {
        location_id: place.id,
      } satisfies ItemMove),
    onMutate: async (move) => {
      await queryClient.cancelQueries({ queryKey: ["items"] });
      return { putBack: showMoved(queryClient, move) };
    },
    onSuccess: (moved, { item, place }) => {
      void queryClient.invalidateQueries({ queryKey: itemHistoryKey(item.id) });
      showToast({
        message: `Moved to ${placeName(place)}`,
        onUndo: () => undo(moved.history_entry_id),
      });
    },
    onError: (error, move, context) => {
      context?.putBack();
      showToast({ message: error.message, onRetry: () => mutate(move) });
    },
    onSettled: () =>
      Promise.all([
        refreshItemLists(queryClient),
        // The tree's counts change; its key is the locations feature's, which cannot be imported here.
        queryClient.invalidateQueries({ queryKey: ["locations"] }),
      ]),
  });
  return (item, place) => mutate({ item, place });
}
