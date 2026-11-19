import type { Item } from "./useItems";

const sinceWords: Partial<Record<Item["status"], string>> = {
  lent_out: "Lent",
  sold: "Sold",
  given_away: "Given away",
  thrown_away: "Thrown away",
};

/** Since when an item has had the status its page names: lent, sold, deleted and so on. */
export function since(item: Item): { words: string; at: Date } | undefined {
  if (item.deleted_at) return { words: "Deleted", at: new Date(item.deleted_at) };
  const words = sinceWords[item.status];
  const at = item.status === "lent_out" ? item.lent_at : item.retired_at;
  return words && at ? { words, at: new Date(at) } : undefined;
}
