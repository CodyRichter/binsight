import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemHistoryKey, useUndo } from "@/features/history";
import { showToast } from "@/lib/toast";
import { itemKey, refreshItemLists, type Item } from "./useItems";

export const lentToNamesKey = ["lent-to-names"] as const;

interface ItemAction<Input> {
  send: (item: Item, input: Input) => Promise<Item & { history_entry_id: string }>;
  /** The item as it will be, shown at once. */
  shown: (item: Item, input: Input) => Item;
  message: (item: Item, input: Input) => string;
}

interface Call<Input> {
  item: Item;
  input: Input;
}

/** Changes an item's status on screen at once, with Undo; a refusal puts it back with Retry. */
export function useItemAction<Input>(
  action: ItemAction<Input>,
): (item: Item, input: Input) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: ({ item, input }: Call<Input>) => action.send(item, input),
    onMutate: ({ item, input }) =>
      queryClient.setQueryData(itemKey(item.id), action.shown(item, input)),
    onSuccess: (changed, { item, input }) =>
      showToast({
        message: action.message(item, input),
        onUndo: () => undo(changed.history_entry_id),
      }),
    onError: (error, call) => {
      queryClient.setQueryData(itemKey(call.item.id), call.item);
      showToast({ message: error.message, onRetry: () => mutate(call) });
    },
    onSettled: (_answer, _error, { item }) =>
      Promise.all([
        refreshItemLists(queryClient),
        queryClient.invalidateQueries({ queryKey: itemKey(item.id) }),
        queryClient.invalidateQueries({ queryKey: itemHistoryKey(item.id) }),
        queryClient.invalidateQueries({ queryKey: lentToNamesKey }),
        // Archived items leave their location's counts; the key is the locations feature's.
        queryClient.invalidateQueries({ queryKey: ["locations"] }),
      ]),
  });
  return (item, input) => mutate({ item, input });
}
