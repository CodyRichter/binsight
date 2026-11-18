import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemHistoryKey, useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemName } from "./placeName";
import { itemKey, refreshItemLists, type Item } from "./useItems";

type ItemRestored = components["schemas"]["ItemRestored"];

/** Brings a deleted item back, on screen at once, with Undo; a refusal shows it deleted again. */
export function useRestoreItem(): (item: Item) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (item: Item) => api.post<ItemRestored>(`/api/items/${item.id}/restore`),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: itemKey(item.id) });
      queryClient.setQueryData<Item>(itemKey(item.id), { ...item, deleted_at: null });
    },
    onSuccess: (restored) =>
      showToast({
        message: `Restored ${itemName(restored.name)}`,
        onUndo: () => undo(restored.history_entry_id),
      }),
    onError: (error, item) => {
      queryClient.setQueryData<Item>(itemKey(item.id), item);
      showToast({ message: error.message, onRetry: () => mutate(item) });
    },
    onSettled: (_answer, _error, item) =>
      Promise.all([
        refreshItemLists(queryClient),
        queryClient.invalidateQueries({ queryKey: itemKey(item.id) }),
        queryClient.invalidateQueries({ queryKey: itemHistoryKey(item.id) }),
        queryClient.invalidateQueries({ queryKey: ["locations"] }),
      ]),
  });
  return (item) => mutate(item);
}
