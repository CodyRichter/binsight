import type { Item } from "./useItems";

/** An item already here with the same name, ignoring case and spaces at the ends. */
export function likelyDuplicate(typed: string, items: Item[]): Item | undefined {
  const name = typed.trim().toLowerCase();
  if (!name) return undefined;
  // A row still being added has no record yet to raise the quantity of.
  return items.find(
    (item) => !item.id.startsWith("adding-") && item.name?.trim().toLowerCase() === name,
  );
}
