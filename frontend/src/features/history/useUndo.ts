import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";

type Undone = components["schemas"]["Undone"];

/** Undoes one history entry; a refusal says why and offers Retry. */
export function useUndo(): (entryId: string) => void {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (entryId: string) => api.post<Undone>(`/api/history/${entryId}/undo`),
    // An undo can touch any record on screen, so whatever is showing is read again.
    onSettled: () => void queryClient.invalidateQueries(),
  });
  const undo = (entryId: string) =>
    mutate(entryId, {
      onError: (error) => showToast({ message: error.message, onRetry: () => undo(entryId) }),
    });
  return undo;
}
