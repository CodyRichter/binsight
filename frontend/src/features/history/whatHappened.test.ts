import { expect, test } from "vitest";
import type { HistoryEntry } from "./useItemHistory";
import { whatHappened } from "./whatHappened";

function entry(action: string, before: HistoryEntry["changes"][number]["before"], after = {}) {
  return {
    id: "entry",
    at: "2026-11-16T12:00:00Z",
    actor: "app",
    action,
    changes: [{ record_type: "item", record_id: "item", before, after }],
    undone_by: null,
  } satisfies HistoryEntry;
}

test("adding an item reads Added", () => {
  expect(whatHappened(entry("item.created", null, { name: "HDMI cable" }), "item")).toBe("Added");
});

test("a quantity change reads from the old number to the new one", () => {
  const changed = entry("item.updated", { quantity: 3 }, { quantity: 4 });
  expect(whatHappened(changed, "item")).toBe("Quantity changed from 3 to 4");
});

test("adding several at once reads Added", () => {
  expect(whatHappened(entry("items.created", null, { name: "Patch cable" }), "item")).toBe("Added");
});

test("naming an item reads Named and the name", () => {
  const named = entry("item.named", { name: null }, { name: "Multimeter" });
  expect(whatHappened(named, "item")).toBe("Named Multimeter");
});

test("an undo reads Undone", () => {
  expect(whatHappened(entry("history.undone", { quantity: 4 }, { quantity: 3 }), "item")).toBe(
    "Undone",
  );
});

test("a move reads Moved", () => {
  const moved = entry("item.moved", { home_location_id: "cables" }, { home_location_id: "tools" });
  expect(whatHappened(moved, "item")).toBe("Moved");
});

test("an action with no wording is a bug, not a blank row", () => {
  expect(() => whatHappened(entry("location.merged", {}), "item")).toThrow("location.merged");
});

test("deleting and restoring read Deleted and Restored", () => {
  const at = "2026-11-16T12:00:00+00:00";
  expect(
    whatHappened(entry("item.deleted", { deleted_at: null }, { deleted_at: at }), "item"),
  ).toBe("Deleted");
  expect(
    whatHappened(entry("item.restored", { deleted_at: at }, { deleted_at: null }), "item"),
  ).toBe("Restored");
});

test("missing and found read Marked missing and Found", () => {
  const marked = entry("item.marked_missing", { status: "in_place" }, { status: "missing" });
  const found = entry("item.found", { status: "missing" }, { status: "in_place" });
  expect(whatHappened(marked, "item")).toBe("Marked missing");
  expect(whatHappened(found, "item")).toBe("Found");
});

test("a check that marked the item missing says so", () => {
  const checked = entry("location.checked", { status: "in_place" }, { status: "missing" });
  expect(whatHappened(checked, "item")).toBe("Marked missing in a check");
});

test("a detail change names the detail", () => {
  const changed = entry("item.updated", { serial_number: null }, { serial_number: "SN-1" });
  expect(whatHappened(changed, "item")).toBe("Serial number changed");
  expect(
    whatHappened(entry("item.updated", { category_id: null }, { category_id: "c" }), "item"),
  ).toBe("Category changed");
});

test("a tag added or removed is named", () => {
  expect(
    whatHappened(entry("item.updated", { tags: ["hdmi"] }, { tags: ["4k", "hdmi"] }), "item"),
  ).toBe("Tagged 4k");
  expect(whatHappened(entry("item.updated", { tags: ["hdmi"] }, { tags: [] }), "item")).toBe(
    "Tag hdmi removed",
  );
});

test("several details changed at once read Details changed", () => {
  const changed = entry("item.updated", { brand: null, model: null }, { brand: "A", model: "B" });
  expect(whatHappened(changed, "item")).toBe("Details changed");
});

test("lending, returning and each status read as what happened", () => {
  expect(whatHappened(entry("item.lent", { status: "in_place" }, { lent_to: "Sam" }), "item")).toBe(
    "Lent to Sam",
  );
  expect(whatHappened(entry("item.returned", { lent_to: "Sam" }, { lent_to: null }), "item")).toBe(
    "Returned",
  );
  const sold = entry("item.status_changed", { status: "in_place" }, { status: "sold" });
  expect(whatHappened(sold, "item")).toBe("Sold");
  const back = entry("item.status_changed", { status: "in_use" }, { status: "in_place" });
  expect(whatHappened(back, "item")).toBe("Back in place");
});

type Change = HistoryEntry["changes"][number];

function link(action: string, before: Change["before"], after: Change["after"]) {
  return {
    id: "entry",
    at: "2026-11-16T12:00:00Z",
    actor: "app",
    action,
    changes: [{ record_type: "link", record_id: "link", before, after }],
    undone_by: null,
  } satisfies HistoryEntry;
}

test("a link reads from each item's own side", () => {
  const partOf = link("item.linked", null, {
    item_id: "bit",
    other_item_id: "kit",
    kind: "part_of",
  });
  expect(whatHappened(partOf, "bit")).toBe("Linked: part of");
  expect(whatHappened(partOf, "kit")).toBe("Linked: a part");
  const together = { item_id: "drill", other_item_id: "charger", kind: "belongs_with" };
  expect(whatHappened(link("item.linked", null, together), "charger")).toBe("Linked: belongs with");
  expect(whatHappened(link("item.unlinked", together, {}), "drill")).toBe("Link removed");
});

test("attaching a file reads Attached and its name", () => {
  const file = entry("item.file_attached", null, { kind: "file", filename: "Receipt.pdf" });
  expect(whatHappened(file, "item")).toBe("Attached Receipt.pdf");
});

test("removing an attachment reads Removed and its name, or what it was", () => {
  const named = entry("item.attachment_removed", { kind: "file", filename: "Manual.pdf" });
  expect(whatHappened(named, "item")).toBe("Removed Manual.pdf");
  const link = entry("item.attachment_removed", { kind: "link", filename: null });
  expect(whatHappened(link, "item")).toBe("Removed a link");
});
