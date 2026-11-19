import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";
import { itemName, placeName } from "./placeName";
import { noDetails } from "./noDetails";
import { useOptimisticAdd } from "./useOptimisticAdd";
import type { Destination, Item } from "./useItems";

type NewItem = components["schemas"]["NewItem"];
type NewItems = components["schemas"]["NewItems"];
type ItemCreated = components["schemas"]["ItemCreated"];
type ItemsCreated = components["schemas"]["ItemsCreated"];

/** How an item being added shows until the backend answers. */
export function adding(name: string | null, home: Destination | null, photoUrl?: string): Item {
  return {
    id: `adding-${crypto.randomUUID()}`,
    name,
    quantity: 1,
    home_location_id: home?.id ?? null,
    path: home?.path ?? [],
    photo_url: photoUrl ?? null,
    created_at: new Date().toISOString(),
    deleted_at: null,
    status: "in_place",
    ...noDetails,
  };
}

/** Adds an item by name to a location or the inbox: it shows at once, with Undo once added. */
export function useAddItem(
  home: Destination | null,
  onSettled: () => void,
): (name: string) => void {
  return useOptimisticAdd({
    home,
    onSettled,
    send: (name: string) =>
      api.post<ItemCreated>("/api/items", {
        name,
        home_location_id: home?.id ?? null,
      } satisfies NewItem),
    shown: (name) => [adding(name, home)],
    createdIds: (created) => [created.id],
    told: (created) => `Added ${itemName(created.name)} to ${placeName(home)}`,
  });
}

/** Adds several items at once, as one change that one Undo takes back. */
export function useAddItems(
  home: Destination | null,
  onSettled: () => void,
): (names: string[]) => void {
  return useOptimisticAdd({
    home,
    onSettled,
    send: (names: string[]) =>
      api.post<ItemsCreated>("/api/items/add-several", {
        names,
        home_location_id: home?.id ?? null,
      } satisfies NewItems),
    shown: (names) => names.map((name) => adding(name, home)),
    createdIds: (created) => created.items.map((item) => item.id),
    told: (created) => `Added ${created.items.length} items to ${placeName(home)}`,
  });
}
