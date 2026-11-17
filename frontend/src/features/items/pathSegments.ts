import type { PathSegment } from "@/components/Path";
import type { Item } from "./useItems";

/** An item's path as links to each location on it. */
export function pathSegments(item: Item): PathSegment[] {
  return item.path.map((step) => ({ name: step.name, to: `/locations/${step.id}` }));
}
