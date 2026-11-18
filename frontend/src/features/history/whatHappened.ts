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

const detailNames: Record<string, string> = {
  category_id: "Category",
  notes: "Notes",
  brand: "Brand",
  model: "Model",
  serial_number: "Serial number",
  purchase_date: "Purchase date",
  price_cents: "Price",
  order_link: "Order link",
  warranty_ends: "Warranty end",
  return_ends: "Return date",
};

// History holds any record's fields, so its values arrive untyped.
function asTags(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function tagsChanged(before: string[], after: string[]): string {
  const added = after.filter((tag) => !before.includes(tag));
  const removed = before.filter((tag) => !after.includes(tag));
  if (added.length && !removed.length) return `Tagged ${added.join(", ")}`;
  if (removed.length && !added.length) return `Tag ${removed.join(", ")} removed`;
  return "Tags changed";
}

function changedFields(change: Change): string {
  const fields = Object.keys(change.after);
  if (fields.length > 1) return "Details changed";
  if ("quantity" in change.after) {
    return `Quantity changed from ${change.before?.quantity} to ${change.after.quantity}`;
  }
  if ("tags" in change.after)
    return tagsChanged(asTags(change.before?.tags), asTags(change.after.tags));
  const [field = ""] = fields;
  if (field in detailNames) return `${detailNames[field]} changed`;
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
