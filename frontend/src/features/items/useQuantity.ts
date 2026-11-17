import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { itemHistoryKey, useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { itemName } from "./placeName";
import { itemKey, itemListsKey, type Item } from "./useItems";

type ItemChanges = components["schemas"]["ItemChanges"];
type ItemUpdated = components["schemas"]["ItemUpdated"];

// Taps closer together than this are one change, so they make one history entry.
const burstMs = 700;

interface Burst {
  before: number;
  latest: number;
  timer: number;
}

interface Sent {
  quantity: number;
  rollbackTo: number;
}

/** Shows an item's new quantity everywhere it is on screen. */
export function showQuantity(queryClient: QueryClient, itemId: string, quantity: number) {
  const changed = (item: Item) => (item.id === itemId ? { ...item, quantity } : item);
  queryClient.setQueryData<Item>(itemKey(itemId), (item) => item && changed(item));
  queryClient.setQueriesData<Item[]>({ queryKey: itemListsKey }, (items) => items?.map(changed));
}

/** Changes an item's quantity on screen at once and sends a burst of taps as one change. */
export function useQuantity(item: Item): (quantity: number) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const burst = useRef<Burst | null>(null);
  const { mutate } = useMutation({
    mutationFn: ({ quantity }: Sent) =>
      api.patch<ItemUpdated>(`/api/items/${item.id}`, { quantity } satisfies ItemChanges),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: itemHistoryKey(item.id) });
      showToast({
        message: `Quantity of ${itemName(updated.name)} changed to ${updated.quantity}`,
        onUndo: () => undo(updated.history_entry_id),
      });
    },
    onError: (error, sent) => {
      showQuantity(queryClient, item.id, sent.rollbackTo);
      showToast({ message: error.message, onRetry: () => retry(sent) });
    },
  });

  function retry(sent: Sent) {
    showQuantity(queryClient, item.id, sent.quantity);
    mutate(sent);
  }

  function flush() {
    const finished = burst.current;
    if (!finished) return;
    window.clearTimeout(finished.timer);
    burst.current = null;
    if (finished.latest === finished.before) return;
    mutate({ quantity: finished.latest, rollbackTo: finished.before });
  }

  // Leaving the page mid-burst still sends what was tapped.
  useEffect(() => () => flush(), []);

  return (quantity: number) => {
    const before = burst.current?.before ?? item.quantity;
    window.clearTimeout(burst.current?.timer);
    burst.current = { before, latest: quantity, timer: window.setTimeout(flush, burstMs) };
    showQuantity(queryClient, item.id, quantity);
  };
}
