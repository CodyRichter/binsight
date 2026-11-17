import type { HistoryEntry } from "./useItemHistory";

type Change = HistoryEntry["changes"][number];

function changedFields(change: Change): string {
  if ("quantity" in change.after) {
    return `Quantity changed from ${change.before?.quantity} to ${change.after.quantity}`;
  }
  return `Named ${change.after.name}`;
}

/** The line a history row says for an entry: "Added", "Quantity changed from 3 to 4". */
export function whatHappened(entry: HistoryEntry): string {
  const [change] = entry.changes.filter((each) => each.record_type === "item");
  if (entry.action === "item.created" || entry.action === "items.created") return "Added";
  if (entry.action === "item.updated" || entry.action === "item.named") {
    return changedFields(change);
  }
  if (entry.action === "history.undone") return "Undone";
  throw new Error(`History has no wording for ${entry.action}`);
}
