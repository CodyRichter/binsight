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
  expect(whatHappened(entry("item.created", null, { name: "HDMI cable" }))).toBe("Added");
});

test("a quantity change reads from the old number to the new one", () => {
  const changed = entry("item.updated", { quantity: 3 }, { quantity: 4 });
  expect(whatHappened(changed)).toBe("Quantity changed from 3 to 4");
});

test("adding several at once reads Added", () => {
  expect(whatHappened(entry("items.created", null, { name: "Patch cable" }))).toBe("Added");
});

test("naming an item reads Named and the name", () => {
  const named = entry("item.named", { name: null }, { name: "Multimeter" });
  expect(whatHappened(named)).toBe("Named Multimeter");
});

test("an undo reads Undone", () => {
  expect(whatHappened(entry("history.undone", { quantity: 4 }, { quantity: 3 }))).toBe("Undone");
});

test("a move reads Moved", () => {
  const moved = entry("item.moved", { home_location_id: "cables" }, { home_location_id: "tools" });
  expect(whatHappened(moved)).toBe("Moved");
});

test("an action with no wording is a bug, not a blank row", () => {
  expect(() => whatHappened(entry("location.merged", {}))).toThrow("location.merged");
});

test("deleting and restoring read Deleted and Restored", () => {
  const at = "2026-11-16T12:00:00+00:00";
  expect(whatHappened(entry("item.deleted", { deleted_at: null }, { deleted_at: at }))).toBe(
    "Deleted",
  );
  expect(whatHappened(entry("item.restored", { deleted_at: at }, { deleted_at: null }))).toBe(
    "Restored",
  );
});

test("missing and found read Marked missing and Found", () => {
  const marked = entry("item.marked_missing", { status: "in_place" }, { status: "missing" });
  const found = entry("item.found", { status: "missing" }, { status: "in_place" });
  expect(whatHappened(marked)).toBe("Marked missing");
  expect(whatHappened(found)).toBe("Found");
});

test("a check that marked the item missing says so", () => {
  const checked = entry("location.checked", { status: "in_place" }, { status: "missing" });
  expect(whatHappened(checked)).toBe("Marked missing in a check");
});

test("a detail change names the detail", () => {
  const changed = entry("item.updated", { serial_number: null }, { serial_number: "SN-1" });
  expect(whatHappened(changed)).toBe("Serial number changed");
  expect(whatHappened(entry("item.updated", { category_id: null }, { category_id: "c" }))).toBe(
    "Category changed",
  );
});

test("a tag added or removed is named", () => {
  expect(whatHappened(entry("item.updated", { tags: ["hdmi"] }, { tags: ["4k", "hdmi"] }))).toBe(
    "Tagged 4k",
  );
  expect(whatHappened(entry("item.updated", { tags: ["hdmi"] }, { tags: [] }))).toBe(
    "Tag hdmi removed",
  );
});

test("several details changed at once read Details changed", () => {
  const changed = entry("item.updated", { brand: null, model: null }, { brand: "A", model: "B" });
  expect(whatHappened(changed)).toBe("Details changed");
});
