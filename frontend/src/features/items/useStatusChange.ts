import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";
import { itemName } from "./placeName";
import { useItemAction } from "./useItemAction";
import type { Item } from "./useItems";

type StatusChange = components["schemas"]["ItemStatusChange"];
type StatusChanged = components["schemas"]["ItemStatusChanged"];
type Lending = components["schemas"]["ItemLending"];
type Lent = components["schemas"]["ItemLent"];
type Returned = components["schemas"]["ItemReturned"];
export type SettableStatus = StatusChange["status"];

const archived: Item["status"][] = ["sold", "given_away", "thrown_away"];

export function isArchived(item: Item): boolean {
  return archived.includes(item.status);
}

const statusWords: Record<SettableStatus, (name: string) => string> = {
  in_place: (name) => `${name} is back in place`,
  in_use: (name) => `Marked ${name} in use`,
  sold: (name) => `Marked ${name} sold`,
  given_away: (name) => `Marked ${name} given away`,
  thrown_away: (name) => `Marked ${name} thrown away`,
};

function retiredAt(item: Item, status: SettableStatus): string | null {
  if (!archived.includes(status)) return null;
  return isArchived(item) ? item.retired_at : new Date().toISOString();
}

/** Marks an item in use, back in place, or sold, given away or thrown away. */
export function useStatusChange(): (item: Item, status: SettableStatus) => void {
  return useItemAction<SettableStatus>({
    send: (item, status) =>
      api.post<StatusChanged>(`/api/items/${item.id}/status`, {
        status,
      } satisfies StatusChange),
    shown: (item, status) => ({
      ...item,
      status,
      lent_to: null,
      lent_at: null,
      retired_at: retiredAt(item, status),
    }),
    message: (item, status) => statusWords[status](itemName(item.name)),
  });
}

/** Lends an item to someone by name; it keeps its home location. */
export function useLend(): (item: Item, lentTo: string) => void {
  return useItemAction<string>({
    send: (item, lentTo) =>
      api.post<Lent>(`/api/items/${item.id}/lend`, { lent_to: lentTo } satisfies Lending),
    shown: (item, lentTo) => ({
      ...item,
      status: "lent_out",
      lent_to: lentTo,
      lent_at: new Date().toISOString(),
      retired_at: null,
    }),
    message: (item, lentTo) => `Lent ${itemName(item.name)} to ${lentTo}`,
  });
}

/** Marks a lent-out item returned: back in place and lent to no one. */
export function useReturn(): (item: Item) => void {
  const returnItem = useItemAction<null>({
    send: (item) => api.post<Returned>(`/api/items/${item.id}/return`),
    shown: (item) => ({ ...item, status: "in_place", lent_to: null, lent_at: null }),
    message: (item) => `Returned ${itemName(item.name)}`,
  });
  return (item) => returnItem(item, null);
}
