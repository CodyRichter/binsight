import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUndo } from "@/features/history";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";
import { reorderedTree } from "./reorderedTree";
import { locationTreeKey, useRefreshAfterHousekeeping, type Location } from "./useLocations";

type LocationTree = components["schemas"]["LocationTree"];
type LocationChanges = components["schemas"]["LocationChanges"];
type LocationUpdated = components["schemas"]["LocationUpdated"];
type LocationReordered = components["schemas"]["LocationReordered"];

function useShowInTree() {
  const queryClient = useQueryClient();
  return (change: (locations: Location[]) => Location[]) =>
    queryClient.setQueryData<LocationTree>(
      locationTreeKey,
      (tree) => tree && { locations: change(tree.locations) },
    );
}

type LocationType = components["schemas"]["LocationType"];

export type Change =
  { name: string } | { summary: string } | { type: LocationType } | { icon: string | null };

function changedWords(changes: Change, updated: LocationUpdated): string {
  if ("name" in changes) return `Renamed to ${updated.name}`;
  if ("type" in changes) return `Changed to ${updated.type}`;
  if ("icon" in changes) return changes.icon ? "Icon changed" : "Icon reset";
  return "Summary changed";
}

/** Renames a location or changes its summary, type or icon, shown at once and put back if refused. */

export function useChangeLocation(location: Location): (changes: Change) => void {
  const undo = useUndo();
  const show = useShowInTree();
  const refresh = useRefreshAfterHousekeeping();
  const { mutate } = useMutation({
    mutationFn: (changes: Change) =>
      api.patch<LocationUpdated>(
        `/api/locations/${location.id}`,
        changes satisfies LocationChanges,
      ),
    // Paths everywhere carry the name, so every list is read again.
    onSettled: refresh,
  });
  const change = (changes: Change) => {
    if ("name" in changes && !changes.name) return;
    show((locations) =>
      locations.map((shown) => (shown.id === location.id ? { ...shown, ...changes } : shown)),
    );
    mutate(changes, {
      onSuccess: (updated) =>
        showToast({
          message: changedWords(changes, updated),
          onUndo: () => undo(updated.history_entry_id),
        }),
      onError: (error) => {
        show((locations) =>
          locations.map((shown) => (shown.id === location.id ? location : shown)),
        );
        showToast({ message: error.message, onRetry: () => change(changes) });
      },
    });
  };
  return change;
}

/** Puts a location at another place among its siblings, at once, with Undo. */
export function useReorderLocation(): (location: Location, index: number) => void {
  const queryClient = useQueryClient();
  const undo = useUndo();
  const show = useShowInTree();
  const { mutate } = useMutation({
    mutationFn: ({ location, index }: { location: Location; index: number }) =>
      api.post<LocationReordered>(`/api/locations/${location.id}/reorder`, { position: index }),
    onMutate: async ({ location, index }) => {
      await queryClient.cancelQueries({ queryKey: locationTreeKey });
      const before = queryClient.getQueryData<LocationTree>(locationTreeKey);
      show((locations) => reorderedTree(locations, location.id, index));
      return { before };
    },
    onSuccess: (moved) =>
      showToast({ message: `Moved ${moved.name}`, onUndo: () => undo(moved.history_entry_id) }),
    onError: (error, moving, context) => {
      queryClient.setQueryData(locationTreeKey, context?.before);
      showToast({ message: error.message, onRetry: () => mutate(moving) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: locationTreeKey }),
  });
  return (location, index) => mutate({ location, index });
}
