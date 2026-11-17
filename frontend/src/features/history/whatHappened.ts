import type { HistoryEntry } from "./useItemHistory";

/** The line a history row says for an entry: "Added", "Quantity changed from 3 to 4". */
export function whatHappened(entry: HistoryEntry): string {
  if (entry.action === "item.created") return "Added";
  if (entry.action === "item.updated") {
    const [change] = entry.changes;
    return `Quantity changed from ${change.before?.quantity} to ${change.after.quantity}`;
  }
  throw new Error(`History has no wording for ${entry.action}`);
}
