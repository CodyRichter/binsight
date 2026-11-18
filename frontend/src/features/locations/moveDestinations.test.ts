import { expect, test } from "vitest";
import { moveDestinations } from "./moveDestinations";
import type { Location } from "./useLocations";

function place(id: string, path: string[], code: string | null = null): Location {
  return {
    id,
    name: id === "shelf" ? "Shelf 2" : id[0].toUpperCase() + id.slice(1),
    type: "bin",
    parent_id: path.at(-2) ?? null,
    summary: null,
    label_code: code,
    path: path.map((step) => ({ id: step, name: step, type: "bin", label_code: null })),
    direct_item_count: 0,
    last_checked_at: null,
    photo_url: null,
    item_count: 0,
  };
}

const tree = [
  place("home", ["home"]),
  place("garage", ["home", "garage"]),
  place("shelf", ["home", "garage", "shelf"]),
  place("cables", ["home", "garage", "shelf", "cables"], "B-014"),
  place("box", ["home", "garage", "shelf", "cables", "box"]),
  place("tools", ["home", "garage", "shelf", "tools"], "B-015"),
  place("attic", ["home", "attic"]),
];
const ids = (locations: Location[]) => locations.map((location) => location.id);
const none = { query: "", currentId: null, recent: [] };

test("every location is offered in tree order, with recently used ones first", () => {
  expect(ids(moveDestinations(tree, { ...none, recent: ["tools", "gone", "attic"] }))).toEqual([
    "tools",
    "attic",
    "home",
    "garage",
    "shelf",
    "cables",
    "box",
  ]);
});

test("a moving location leaves out where it is, itself and everything inside it", () => {
  const choices = moveDestinations(tree, { ...none, currentId: "shelf", movingId: "cables" });
  expect(ids(choices)).toEqual(["home", "garage", "tools", "attic"]);
});

test("typing finds by part of a name, or by code without the hyphen or the zero", () => {
  expect(ids(moveDestinations(tree, { ...none, query: "shelf" }))).toEqual(["shelf"]);
  expect(ids(moveDestinations(tree, { ...none, query: "b15" }))).toEqual(["tools"]);
  expect(ids(moveDestinations(tree, { ...none, query: "B-014" }))).toEqual(["cables"]);
});
