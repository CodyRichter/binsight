import type { Location } from "./useLocations";

export interface TreeRow {
  location: Location;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

/** The locations directly inside a parent, or the sites when there is none. */
export function childrenOf(locations: Location[], parentId: string | null): Location[] {
  return locations.filter((location) => location.parent_id === parentId);
}

/** The rows a tree shows: the sites, and inside each open location the locations it holds. */
export function treeRows(locations: Location[], open: Set<string>): TreeRow[] {
  const rowsUnder = (parentId: string | null, depth: number): TreeRow[] =>
    childrenOf(locations, parentId).flatMap((location) => {
      const hasChildren = locations.some((other) => other.parent_id === location.id);
      const expanded = hasChildren && open.has(location.id);
      const row = { location, depth, hasChildren, expanded };
      return expanded ? [row, ...rowsUnder(location.id, depth + 1)] : [row];
    });
  return rowsUnder(null, 0);
}
