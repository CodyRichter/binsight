import { useQueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import { showToast } from "@/lib/toast";
import { useSendChange, type ItemChanges } from "./useItemChange";
import { itemKey, type Item } from "./useItems";
import { categoriesKey, tagsKey } from "./useNames";

/** Changes an item's category, tags or details: shown at once, put back if refused, with Undo. */
export function useDetailChange(item: Item): (changes: ItemChanges, message: string) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useSendChange();
  const show = (shown: Partial<Item>) =>
    queryClient.setQueryData<Item>(
      itemKey(item.id),
      (current) => current && { ...current, ...shown },
    );
  const change = (changes: ItemChanges, message: string) => {
    const before = queryClient.getQueryData<Item>(itemKey(item.id)) ?? item;
    show(changes as Partial<Item>);
    mutate(
      { id: item.id, changes },
      {
        onSuccess: (updated) =>
          showToast({ message, onUndo: () => undo(updated.history_entry_id) }),
        onError: (error) => {
          show(before);
          showToast({ message: error.message, onRetry: () => change(changes, message) });
        },
        onSettled: () => {
          void queryClient.invalidateQueries({ queryKey: categoriesKey });
          void queryClient.invalidateQueries({ queryKey: tagsKey });
        },
      },
    );
  };
  return change;
}
