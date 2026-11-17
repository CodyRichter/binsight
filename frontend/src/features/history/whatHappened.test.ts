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

test("an action with no wording is a bug, not a blank row", () => {
  expect(() => whatHappened(entry("item.moved", {}))).toThrow("item.moved");
});
