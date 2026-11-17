import { expect, test } from "vitest";
import { movedTree } from "./movedTree";
import type { Location } from "./useLocations";

function place(id: string, path: string[], parentId: string | null): Location {
  return {
    id,
    name: id,
    type: "bin",
    parent_id: parentId,
    summary: null,
    label_code: null,
    path: path.map((step) => ({ id: step, name: step, type: "bin", label_code: null })),
    direct_item_count: 0,
    item_count: 0,
  };
}

test("a moved location takes everything inside it to the new parent", () => {
  const tree = [
    place("home", ["home"], null),
    place("shelf", ["home", "shelf"], "home"),
    place("cables", ["home", "shelf", "cables"], "shelf"),
    place("box", ["home", "shelf", "cables", "box"], "cables"),
    place("garage", ["home", "garage"], "home"),
  ];
  const moved = movedTree(tree, "cables", tree[4]);
  const paths = moved.map((location) => location.path.map((step) => step.id).join(">"));
  expect(paths).toEqual([
    "home",
    "home>shelf",
    "home>garage>cables",
    "home>garage>cables>box",
    "home>garage",
  ]);
  expect(moved[2].parent_id).toBe("garage");
  expect(moved[3].parent_id).toBe("cables");
});
