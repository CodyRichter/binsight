import type { LocationType } from "@/components/locationIcons";
import type { Location } from "./useLocations";

/** The type a new location starts with, which its own page can change. */
export function newLocationType(parent: Location | undefined): LocationType {
  if (!parent) return "site";
  return parent.type === "site" ? "room" : "bin";
}
