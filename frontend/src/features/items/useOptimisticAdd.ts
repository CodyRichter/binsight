import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import { showToast } from "@/lib/toast";
import {
  itemListKey,
  itemListsKey,
  refreshItemLists,
  type Destination,
  type Item,
} from "./useItems";

export const addingKey = ["items", "add"] as const;

interface OptimisticAdd<Sent, Answer> {
  home: Destination | null;
  send: (sent: Sent) => Promise<Answer>;
  shown: (sent: Sent) => Item[];
  told: (answer: Answer) => string;
  onSettled: () => void;
  afterwards?: () => void;
}

/** A row on screen at once for each added item, taken back if refused; Undo once added. */
export function useOptimisticAdd<Sent, Answer extends { history_entry_id: string }>(
  options: OptimisticAdd<Sent, Answer>,
): (sent: Sent) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { home } = options;
  const lists = home ? [itemListKey(home.id, false), itemListKey(home.id, true)] : [];
  const create = useMutation({
    mutationKey: addingKey,
    mutationFn: options.send,
    onMutate: async (sent: Sent) => {
      await queryClient.cancelQueries({ queryKey: itemListsKey });
      const shown = options.shown(sent);
      for (const key of lists) {
        queryClient.setQueryData<Item[]>(key, (items) => items && [...items, ...shown]);
      }
      return shown.map((item) => item.id);
    },
    onError: (_error, _sent, shownIds) => {
      for (const key of lists) {
        queryClient.setQueryData<Item[]>(key, (items) =>
          items?.filter((item) => !shownIds?.includes(item.id)),
        );
      }
    },
    onSettled: async () => {
      // Reading the list while another add is on its way would drop that one from the screen.
      if (queryClient.isMutating({ mutationKey: addingKey }) > 1) return;
      await refreshItemLists(queryClient);
      options.onSettled();
    },
  });
  const add = (sent: Sent) =>
    create.mutate(sent, {
      onSuccess: (answer) =>
        showToast({ message: options.told(answer), onUndo: () => undo(answer.history_entry_id) }),
      onError: (error) => showToast({ message: error.message, onRetry: () => add(sent) }),
      onSettled: options.afterwards,
    });
  return add;
}
