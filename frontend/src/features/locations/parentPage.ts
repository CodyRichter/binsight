import type { Location } from "./useLocations";

/** Where Back goes from a location's page: its parent's page, or the tree for a site. */
export function parentPage(location: Location | null | undefined): string {
  return location?.parent_id ? `/locations/${location.parent_id}` : "/";
}
