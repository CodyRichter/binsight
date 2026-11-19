import type { HistoryEntry } from "./useItemHistory";

type Change = HistoryEntry["changes"][number];

const fixedWords: Record<string, string> = {
  "item.created": "Added",
  "items.created": "Added",
  "items.imported": "Imported",
  "item.moved": "Moved",
  "item.deleted": "Deleted",
  "item.restored": "Restored",
  "item.marked_missing": "Marked missing",
  "item.found": "Found",
  // Checks are gone (decision 0020), but an item's history keeps those that marked it missing.
  "location.checked": "Marked missing in a check",
  "history.undone": "Undone",
  "item.returned": "Returned",
  "item.unlinked": "Link removed",
  "item.photo_added": "Added a photo",
  "item.web_link_attached": "Attached a link",
};

const statusWords: Record<string, string> = {
  in_place: "Back in place",
  in_use: "Marked in use",
  sold: "Sold",
  given_away: "Given away",
  thrown_away: "Thrown away",
};

const linkedWords = {
  belongs_with: "Linked: belongs with",
  part_of: "Linked: part of",
  part: "Linked: a part",
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

// History stores identifiers only, so a link reads from this item's side, without the other's name.
function linked(entry: HistoryEntry, itemId: string): string {
  const [link] = entry.changes;
  if (link.after.kind === "belongs_with") return linkedWords.belongs_with;
  return link.after.item_id === itemId ? linkedWords.part_of : linkedWords.part;
}

// A merge deletes the item folded in and changes the one it went into; names aren't kept.
function merged(entry: HistoryEntry, itemId: string): string {
  const folded = entry.changes.some(
    (change) => change.record_id === itemId && "deleted_at" in change.after,
  );
  return folded ? "Merged into another item" : "Another item merged into this";
}

const removedWords = { photo: "Removed a photo", file: "Removed a file", link: "Removed a link" };

// An attachment's fields are what was attached, or, once removed, what it was before.
function attached(entry: HistoryEntry): string {
  const [change] = entry.changes;
  const fields = change.before ?? change.after;
  const name = fields.filename ? String(fields.filename) : undefined;
  if (entry.action === "item.file_attached") return `Attached ${name ?? "a file"}`;
  const kind = String(fields.kind) as keyof typeof removedWords;
  return name ? `Removed ${name}` : removedWords[kind];
}

/** The line a history row says for an entry: "Added", "Quantity changed from 3 to 4". */
export function whatHappened(entry: HistoryEntry, itemId: string): string {
  const words = fixedWords[entry.action];
  if (words) return words;
  if (entry.action === "item.linked") return linked(entry, itemId);
  if (entry.action === "item.merged") return merged(entry, itemId);
  if (entry.action === "item.file_attached" || entry.action === "item.attachment_removed") {
    return attached(entry);
  }
  const [change] = entry.changes.filter((each) => each.record_type === "item");
  if (entry.action === "item.updated" || entry.action === "item.named") {
    return changedFields(change);
  }
  if (entry.action === "item.lent") return `Lent to ${change.after.lent_to}`;
  if (entry.action === "item.status_changed") return statusWords[String(change.after.status)];
  throw new Error(`History has no wording for ${entry.action}`);
}
