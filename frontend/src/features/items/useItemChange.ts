import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemHistoryKey, useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemName } from "./placeName";
import { showQuantity } from "./useQuantity";
import { itemKey, refreshItemLists, type Item } from "./useItems";

type ItemChanges = components["schemas"]["ItemChanges"];
type ItemUpdated = components["schemas"]["ItemUpdated"];

function useSendChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: ItemChanges }) =>
      api.patch<ItemUpdated>(`/api/items/${id}`, changes),
    onSettled: (_answer, _error, { id }) => {
      void refreshItemLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: itemKey(id) });
      void queryClient.invalidateQueries({ queryKey: itemHistoryKey(id) });
    },
  });
}

/** Raises a likely duplicate's quantity by one instead of adding a second item. */
export function useAddToExisting(): (item: Item) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useSendChange();
  const addOneMore = (item: Item) => {
    showQuantity(queryClient, item.id, item.quantity + 1);
    mutate(
      { id: item.id, changes: { quantity: item.quantity + 1 } },
      {
        onSuccess: (updated) =>
          showToast({
            message: `Added 1 more ${itemName(updated.name)}`,
            onUndo: () => undo(updated.history_entry_id),
          }),
        onError: (error) => {
          showQuantity(queryClient, item.id, item.quantity);
          showToast({ message: error.message, onRetry: () => addOneMore(item) });
        },
      },
    );
  };
  return addOneMore;
}

/** Gives an item its name, shown at once and put back if refused. */
export function useRename(item: Item): (name: string) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useSendChange();
  const showName = (name: string | null) =>
    queryClient.setQueryData<Item>(itemKey(item.id), (shown) => shown && { ...shown, name });
  const rename = (name: string) => {
    if (!name) return;
    showName(name);
    mutate(
      { id: item.id, changes: { name } },
      {
        onSuccess: (updated) =>
          showToast({
            message: `Named ${itemName(updated.name)}`,
            onUndo: () => undo(updated.history_entry_id),
          }),
        onError: (error) => {
          showName(item.name);
          showToast({ message: error.message, onRetry: () => rename(name) });
        },
      },
    );
  };
  return rename;
}
