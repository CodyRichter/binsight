import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import { placeName } from "@/features/items";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { movedTree } from "./movedTree";
import { locationTreeKey, type Location } from "./useLocations";

type LocationTree = components["schemas"]["LocationTree"];
type LocationMove = components["schemas"]["LocationMove"];
type LocationMoved = components["schemas"]["LocationMoved"];

/** Moves a location and everything in it, on screen at once, with Undo; a refusal puts it back. */
export function useMoveLocation(location: Location): (parent: Location) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (parent: Location) =>
      api.post<LocationMoved>(`/api/locations/${location.id}/move`, {
        parent_id: parent.id,
      } satisfies LocationMove),
    onMutate: async (parent) => {
      await queryClient.cancelQueries({ queryKey: locationTreeKey });
      const before = queryClient.getQueryData<LocationTree>(locationTreeKey);
      queryClient.setQueryData<LocationTree>(
        locationTreeKey,
        (tree) => tree && { locations: movedTree(tree.locations, location.id, parent) },
      );
      return { before };
    },
    onSuccess: (moved, parent) =>
      showToast({
        message: `Moved to ${placeName(parent)}`,
        onUndo: () => undo(moved.history_entry_id),
      }),
    onError: (error, parent, context) => {
      queryClient.setQueryData(locationTreeKey, context?.before);
      showToast({ message: error.message, onRetry: () => mutate(parent) });
    },
    // The paths of everything inside changed too, wherever it is listed.
    onSettled: () =>
      Promise.all(
        [locationTreeKey, ["items"], ["search"]].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
  return (parent) => mutate(parent);
}
