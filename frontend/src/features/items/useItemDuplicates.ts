import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemName } from "./placeName";
import type { Item } from "./useItems";

type ItemCreated = components["schemas"]["ItemCreated"];
type ItemMerged = components["schemas"]["ItemMerged"];

async function refreshAll(queryClient: QueryClient) {
  // Both items' pages and history, every list they are in, and counts; most keys are other features'.
  await Promise.all(
    ["items", "search", "views", "saved-searches", "locations", "history"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

// Leaving once stored, and toasts in the options, which outlive the page that asked.

/** Adds a copy of an item beside it, then opens the copy, with Undo. */
export function useDuplicateItem(): (item: Item) => void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (item: Item) => api.post<ItemCreated>(`/api/items/${item.id}/duplicate`),
    onSuccess: (copy) => {
      void navigate(`/items/${copy.id}`);
      showToast({
        message: `Duplicated ${itemName(copy.name)}`,
        onUndo: () => undo(copy.history_entry_id),
      });
    },
    onError: (error, item) => showToast({ message: error.message, onRetry: () => mutate(item) }),
    onSettled: () => refreshAll(queryClient),
  });
  return (item) => mutate(item);
}

interface Merge {
  item: Item;
  into: Item;
}

/** Folds an item into another, then opens the one merged into, with Undo. */
export function useMergeItem(): (item: Item, into: Item) => void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: ({ item, into }: Merge) =>
      api.post<ItemMerged>(`/api/items/${item.id}/merge`, { into: into.id }),
    onSuccess: (merged, { item }) => {
      void navigate(`/items/${merged.id}`);
      showToast({
        message: `Merged ${itemName(item.name)} into ${itemName(merged.name)}`,
        onUndo: () => undo(merged.history_entry_id),
      });
    },
    onError: (error, merge) => showToast({ message: error.message, onRetry: () => mutate(merge) }),
    onSettled: () => refreshAll(queryClient),
  });
  return (item, into) => mutate({ item, into });
}
