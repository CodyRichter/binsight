import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { itemHistoryKey, useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemName } from "./placeName";
import { itemKey, itemListKey, refreshItemLists, type Item } from "./useItems";

type ItemDeleted = components["schemas"]["ItemDeleted"];

/** Takes the item out of its location's list and marks it deleted, before the answer. */
function showDeleted(queryClient: QueryClient, item: Item) {
  const listKey = itemListKey(item.home_location_id ?? "", false);
  const before = queryClient.getQueryData<Item[]>(listKey);
  queryClient.setQueryData<Item[]>(listKey, (items) =>
    items?.filter((each) => each.id !== item.id),
  );
  queryClient.setQueryData<Item>(itemKey(item.id), {
    ...item,
    deleted_at: new Date().toISOString(),
  });
  return () => {
    queryClient.setQueryData(listKey, before);
    queryClient.setQueryData(itemKey(item.id), item);
  };
}

/** Deletes an item and goes to where it was, with Undo; a refusal puts it back. */
export function useDeleteItem(): (item: Item) => void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (item: Item) => api.delete<ItemDeleted>(`/api/items/${item.id}`),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: ["items"] });
      return { putBack: showDeleted(queryClient, item) };
    },
    onSuccess: (deleted) =>
      showToast({
        message: `Deleted ${itemName(deleted.name)}`,
        onUndo: () => undo(deleted.history_entry_id),
      }),
    onError: (error, item, context) => {
      context?.putBack();
      showToast({ message: error.message, onRetry: () => mutate(item) });
    },
    onSettled: (_answer, _error, item) =>
      Promise.all([
        refreshItemLists(queryClient),
        queryClient.invalidateQueries({ queryKey: itemKey(item.id) }),
        queryClient.invalidateQueries({ queryKey: itemHistoryKey(item.id) }),
        // The tree's counts change; its key is the locations feature's, which cannot be imported here.
        queryClient.invalidateQueries({ queryKey: ["locations"] }),
      ]),
  });
  return (item) => {
    mutate(item);
    void navigate(item.home_location_id ? `/locations/${item.home_location_id}` : "/inbox");
  };
}
