import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { useItemAction } from "./useItemAction";
import { refreshItemLists, type Item } from "./useItems";

type NewOwnItem = components["schemas"]["NewOwnItem"];
type ItemCreated = components["schemas"]["ItemCreated"];
type ItemUpdated = components["schemas"]["ItemUpdated"];

/** Tracks a location as an item, then opens the item so its price can be typed straight away. */
export function useMakeOwnItem(locationId: string): () => void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: () =>
      api.post<ItemCreated>("/api/items/own-item", {
        location_id: locationId,
      } satisfies NewOwnItem),
    onSuccess: (made) => {
      void navigate(`/items/${made.id}`);
      showToast({ message: "Tracked as an item", onUndo: () => undo(made.history_entry_id) });
    },
    onError: (error) => showToast({ message: error.message, onRetry: () => mutate() }),
    // The location's own item is the locations feature's to show.
    onSettled: () =>
      Promise.all([
        refreshItemLists(queryClient),
        queryClient.invalidateQueries({ queryKey: ["locations"] }),
      ]),
  });
  return () => mutate();
}

/** Makes an item a location's own item, or with null stops it being one, with Undo. */
export function useOwnItemOf(): (item: Item, locationId: string | null) => void {
  return useItemAction<string | null>({
    send: (item, locationId) =>
      api.patch<ItemUpdated>(`/api/items/${item.id}`, { own_item_of: locationId }),
    shown: (item, locationId) => ({
      ...item,
      own_item_of: locationId,
      home_location_id: locationId ?? item.home_location_id,
    }),
    message: (_item, locationId) =>
      locationId ? "Tracked as an item" : "No longer tracked as an item",
  });
}
