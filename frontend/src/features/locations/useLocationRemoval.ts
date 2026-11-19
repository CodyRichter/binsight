import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { parentPage } from "./parentPage";
import { locationTreeKey, useRefreshAfterHousekeeping, type Location } from "./useLocations";

type LocationTree = components["schemas"]["LocationTree"];
type LocationDeleted = components["schemas"]["LocationDeleted"];
type LocationMerged = components["schemas"]["LocationMerged"];
type LocationRestored = components["schemas"]["LocationRestored"];

/** Takes the location out of the tree, so the page gone to no longer lists it. */
function useHideFromTree() {
  const queryClient = useQueryClient();
  return (location: Location) =>
    queryClient.setQueryData<LocationTree>(
      locationTreeKey,
      (tree) => tree && { locations: tree.locations.filter((each) => each.id !== location.id) },
    );
}

// Leaving once stored: a page opened sooner reads its items early, and a refetch joins that read.
// Toasts sit here rather than on mutate, which drops them once the asking page has gone.

/** Deletes a location, its contents going to the place picked, then goes to its parent, with Undo. */
export function useDeleteLocation(location: Location): (destination?: Location) => void {
  const navigate = useNavigate();
  const undo = useUndo();
  const hide = useHideFromTree();
  const { mutate } = useMutation({
    mutationFn: (destination?: Location) =>
      api.delete<LocationDeleted>(
        `/api/locations/${location.id}` +
          (destination ? `?move_contents_to=${encodeURIComponent(destination.id)}` : ""),
      ),
    onSuccess: (deleted) => {
      hide(location);
      void navigate(parentPage(location));
      showToast({
        message: `Deleted ${deleted.name}`,
        onUndo: () => undo(deleted.history_entry_id),
      });
    },
    onError: (error, destination) =>
      showToast({ message: error.message, onRetry: () => mutate(destination) }),
    onSettled: useRefreshAfterHousekeeping(),
  });
  return (destination) => mutate(destination);
}

/** Merges a location into the one picked, then goes there, with Undo. */
export function useMergeLocation(location: Location): (into: Location) => void {
  const navigate = useNavigate();
  const undo = useUndo();
  const hide = useHideFromTree();
  const { mutate } = useMutation({
    mutationFn: (into: Location) =>
      api.post<LocationMerged>(`/api/locations/${location.id}/merge`, { into: into.id }),
    onSuccess: (merged) => {
      hide(location);
      void navigate(`/locations/${merged.id}`);
      showToast({
        message: `Merged ${location.name} into ${merged.name}`,
        onUndo: () => undo(merged.history_entry_id),
      });
    },
    onError: (error, into) => showToast({ message: error.message, onRetry: () => mutate(into) }),
    onSettled: useRefreshAfterHousekeeping(),
  });
  return (into) => mutate(into);
}

/** Brings a deleted location back, empty, where it was, with Undo. */
export function useRestoreLocation(): (location: Location) => void {
  const undo = useUndo();
  const { mutate } = useMutation({
    mutationFn: (location: Location) =>
      api.post<LocationRestored>(`/api/locations/${location.id}/restore`),
    onSuccess: (restored) =>
      showToast({
        message: `Restored ${restored.name}`,
        onUndo: () => undo(restored.history_entry_id),
      }),
    onError: (error, location) =>
      showToast({ message: error.message, onRetry: () => mutate(location) }),
    onSettled: useRefreshAfterHousekeeping(),
  });
  return (location) => mutate(location);
}
