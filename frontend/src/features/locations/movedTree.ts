import type { Location } from "./useLocations";

/** The tree as it reads once a location has moved: it and everything inside it, under a new parent. */
export function movedTree(locations: Location[], movingId: string, parent: Location): Location[] {
  return locations.map((location) => {
    const from = location.path.findIndex((step) => step.id === movingId);
    if (from === -1) return location;
    const path = [...parent.path, ...location.path.slice(from)];
    return location.id === movingId
      ? { ...location, parent_id: parent.id, path }
      : { ...location, path };
  });
}
