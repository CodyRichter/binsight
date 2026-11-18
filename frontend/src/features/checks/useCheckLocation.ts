import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";

type CheckLocation = components["schemas"]["CheckLocation"];
type LocationChecked = components["schemas"]["LocationChecked"];

function checkedMessage(missingCount: number): string {
  if (missingCount === 0) return "Contents checked";
  return `Marked ${missingCount} ${missingCount === 1 ? "item" : "items"} missing`;
}

/** Records that a location's contents are right, marking any items not found missing, with Undo. */
export function useCheckLocation(locationId: string): (missingItemIds?: string[]) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (missingItemIds: string[]) =>
      api.post<LocationChecked>(`/api/locations/${locationId}/check`, {
        missing_item_ids: missingItemIds,
      } satisfies CheckLocation),
    onSuccess: (checked) =>
      showToast({
        message: checkedMessage(checked.marked_missing.length),
        onUndo: () => undo(checked.history_entry_id),
      }),
    onError: (error, missingItemIds) =>
      showToast({ message: error.message, onRetry: () => mutate(missingItemIds) }),
    // A check changes the location, its items and their history; the first two keys belong to features this one cannot import.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["locations"] }),
        queryClient.invalidateQueries({ queryKey: ["items"] }),
        queryClient.invalidateQueries({ queryKey: ["history"] }),
      ]),
  });
  return (missingItemIds = []) => mutate(missingItemIds);
}
