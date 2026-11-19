import type { Location } from "./useLocations";

/** The tree as it reads once a location is put at another place among its siblings. */
export function reorderedTree(locations: Location[], movingId: string, index: number): Location[] {
  const moving = locations.find((location) => location.id === movingId);
  if (!moving) return locations;
  const rest = locations.filter((location) => location.id !== movingId);
  const siblings = rest.filter((location) => location.parent_id === moving.parent_id);
  const before = siblings[index];
  const at = before ? rest.indexOf(before) : rest.indexOf(siblings.at(-1) ?? moving) + 1;
  return [...rest.slice(0, at), moving, ...rest.slice(at)];
}
