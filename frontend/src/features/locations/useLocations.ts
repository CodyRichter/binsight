import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { components } from "@/types/api.generated";

export type Location = components["schemas"]["Location"];
type LocationTree = components["schemas"]["LocationTree"];
type NewLocation = components["schemas"]["NewLocation"];
type LocationCreated = components["schemas"]["LocationCreated"];

export const locationTreeKey = ["locations"] as const;

/** Every location in the home, read once and shared by the tree and each location's page. */
export function useLocationTree(enabled = true) {
  return useQuery({
    queryKey: locationTreeKey,
    enabled,
    queryFn: ({ signal }) => api.get<LocationTree>("/api/locations", signal),
    select: (tree) => tree.locations,
  });
}

/** Reads the tree again, so its item counts follow a change made elsewhere. */
export function useRefreshLocationTree(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: locationTreeKey });
}

/** Adds a location; the tree shows it once the backend has it. */
export function useCreateLocation(): (
  location: NewLocation,
  onCreated?: (created: LocationCreated) => void,
) => void {
  const refresh = useRefreshLocationTree();
  const create = useMutation({
    mutationFn: (location: NewLocation) => api.post<LocationCreated>("/api/locations", location),
    onSuccess: refresh,
  });
  const add = (location: NewLocation, onCreated?: (created: LocationCreated) => void) =>
    create.mutate(location, {
      onSuccess: onCreated,
      onError: (error) =>
        showToast({ message: error.message, onRetry: () => add(location, onCreated) }),
    });
  return add;
}
