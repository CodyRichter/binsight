import type { Destination } from "./useItems";

/** What a toast calls a destination: "Cables", "Garage", or "Inbox". */
export function placeName(home: Destination | null): string {
  return home ? home.name : "Inbox";
}

/** What an item is called where its name would show; a photo stands in until it is named. */
export function itemName(name: string | null): string {
  return name ?? "Unnamed";
}
