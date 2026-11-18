import type { HistoryEntry } from "./useItemHistory";

type Change = HistoryEntry["changes"][number];

const fixedWords: Record<string, string> = {
  "item.created": "Added",
  "items.created": "Added",
  "item.moved": "Moved",
  "item.deleted": "Deleted",
  "item.restored": "Restored",
  "item.marked_missing": "Marked missing",
  "item.found": "Found",
  // An item's history shows a check only when the check marked it missing.
  "location.checked": "Marked missing in a check",
  "history.undone": "Undone",
};

function changedFields(change: Change): string {
  if ("quantity" in change.after) {
    return `Quantity changed from ${change.before?.quantity} to ${change.after.quantity}`;
  }
  return `Named ${change.after.name}`;
}

/** The line a history row says for an entry: "Added", "Quantity changed from 3 to 4". */
export function whatHappened(entry: HistoryEntry): string {
  const words = fixedWords[entry.action];
  if (words) return words;
  const [change] = entry.changes.filter((each) => each.record_type === "item");
  if (entry.action === "item.updated" || entry.action === "item.named") {
    return changedFields(change);
  }
  throw new Error(`History has no wording for ${entry.action}`);
}
