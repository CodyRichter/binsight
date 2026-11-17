import { pathSegments } from "./pathSegments";
import type { Destination } from "./useItems";

/** What a toast calls a destination: "Bin B-014", "Garage", or "Inbox". */
export function placeName(home: Destination | null): string {
  if (!home) return "Inbox";
  return pathSegments(home.path).at(-1)?.name ?? home.name;
}

/** What an item is called where its name would show; a photo stands in until it is named. */
export function itemName(name: string | null): string {
  return name ?? "Unnamed";
}
