import { expect, test } from "vitest";
import { moveDestinations } from "./moveDestinations";
import type { Location } from "./useLocations";

const cables = "B2R-W9T";
const tools = "K7Q-4MZ";
const names: Record<string, string> = { shelf: "Shelf 2", [cables]: "Cables", [tools]: "Tools" };

function place(id: string, path: string[]): Location {
  return {
    id,
    name: names[id] ?? id[0].toUpperCase() + id.slice(1),
    type: "bin",
    parent_id: path.at(-2) ?? null,
    summary: null,
    icon: null,
    own_item_id: null,
    path: path.map((step) => ({ id: step, name: step, type: "bin" })),
    direct_item_count: 0,
    photo_url: null,
    deleted_at: null,
    item_count: 0,
  };
}

const tree = [
  place("home", ["home"]),
  place("garage", ["home", "garage"]),
  place("shelf", ["home", "garage", "shelf"]),
  place(cables, ["home", "garage", "shelf", cables]),
  place("box", ["home", "garage", "shelf", cables, "box"]),
  place(tools, ["home", "garage", "shelf", tools]),
  place("attic", ["home", "attic"]),
];
const ids = (locations: Location[]) => locations.map((location) => location.id);
const none = { query: "", currentId: null, recent: [] };

test("every location is offered in tree order, with recently used ones first", () => {
  expect(ids(moveDestinations(tree, { ...none, recent: [tools, "gone", "attic"] }))).toEqual([
    tools,
    "attic",
    "home",
    "garage",
    "shelf",
    cables,
    "box",
  ]);
});

test("a moving location leaves out where it is, itself and everything inside it", () => {
  const choices = moveDestinations(tree, { ...none, currentId: "shelf", movingId: cables });
  expect(ids(choices)).toEqual(["home", "garage", tools, "attic"]);
});

test("typing finds by part of a name, or by code in any case and without the hyphen", () => {
  expect(ids(moveDestinations(tree, { ...none, query: "shelf" }))).toEqual(["shelf"]);
  expect(ids(moveDestinations(tree, { ...none, query: "k7q4mz" }))).toEqual([tools]);
  expect(ids(moveDestinations(tree, { ...none, query: "B2R-W9T" }))).toEqual([cables]);
});
