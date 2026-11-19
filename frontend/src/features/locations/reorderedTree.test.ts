import { expect, test } from "vitest";
import { reorderedTree } from "./reorderedTree";
import { childrenOf } from "./treeRows";
import type { Location } from "./useLocations";

function place(id: string, parentId: string | null): Location {
  return {
    id,
    name: id,
    type: "bin",
    parent_id: parentId,
    summary: null,
    icon: null,
    path: [],
    direct_item_count: 0,
    photo_url: null,
    deleted_at: null,
    item_count: 0,
  };
}

const tree = [
  place("home", null),
  place("shelf", "home"),
  place("cables", "shelf"),
  place("garage", "home"),
  place("tools", "shelf"),
  place("bins", "shelf"),
];

function shelf(locations: Location[]): string[] {
  return childrenOf(locations, "shelf").map((location) => location.id);
}

test("a location moves to the place asked for among its siblings", () => {
  expect(shelf(reorderedTree(tree, "bins", 0))).toEqual(["bins", "cables", "tools"]);
  expect(shelf(reorderedTree(tree, "cables", 1))).toEqual(["tools", "cables", "bins"]);
});

test("a place past the end puts it last, and other parents keep their order", () => {
  const moved = reorderedTree(tree, "cables", 9);
  expect(shelf(moved)).toEqual(["tools", "bins", "cables"]);
  expect(childrenOf(moved, "home").map((location) => location.id)).toEqual(["shelf", "garage"]);
});
