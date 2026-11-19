import { expect, test } from "vitest";
import { treeRows } from "./treeRows";
import type { Location } from "./useLocations";

function location(id: string, parentId: string | null): Location {
  return {
    id,
    name: id,
    type: parentId ? "bin" : "site",
    parent_id: parentId,
    summary: null,
    label_code: null,
    path: [],
    direct_item_count: 0,
    last_checked_at: null,
    photo_url: null,
    deleted_at: null,
    item_count: 0,
  };
}

const home = [
  location("home", null),
  location("garage", "home"),
  location("shelf", "garage"),
  location("cabin", null),
];

function shown(open: string[]) {
  return treeRows(home, new Set(open)).map((row) => [row.location.id, row.depth, row.expanded]);
}

test("a closed tree shows only the sites", () => {
  expect(shown([])).toEqual([
    ["home", 0, false],
    ["cabin", 0, false],
  ]);
});

test("an open location shows what it holds beneath it, one level deeper", () => {
  expect(shown(["home", "garage"])).toEqual([
    ["home", 0, true],
    ["garage", 1, true],
    ["shelf", 2, false],
    ["cabin", 0, false],
  ]);
});

test("a location inside a closed one stays hidden even when open itself", () => {
  expect(shown(["garage"])).toEqual([
    ["home", 0, false],
    ["cabin", 0, false],
  ]);
});

test("only a location holding others can expand", () => {
  const rows = treeRows(home, new Set(["cabin"]));
  expect(rows.map((row) => [row.location.id, row.hasChildren, row.expanded])).toEqual([
    ["home", true, false],
    ["cabin", false, false],
  ]);
});
