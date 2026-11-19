import { expect, test } from "vitest";
import { searchIcons, shownAtMost } from "./iconSearch";

const index: [string, string][] = [
  ["fridge", "devices refrigerator freezer kitchen appliance"],
  ["tools-kitchen-2", "food fork knife kitchen cutlery"],
  ["tools", "design hammer screwdriver"],
  ["bike", "vehicles bicycle cycling"],
];

test("an exact name comes first, then names holding the words, then tags", () => {
  expect(searchIcons(index, "tools").names).toEqual(["tools", "tools-kitchen-2"]);
  expect(searchIcons(index, "kitchen").names).toEqual(["tools-kitchen-2", "fridge"]);
});

test("words match in any order, across the name and its tags", () => {
  expect(searchIcons(index, "kitchen tools").names).toEqual(["tools-kitchen-2"]);
  expect(searchIcons(index, "Freezer KITCHEN").names).toEqual(["fridge"]);
  expect(searchIcons(index, "bicycle").names).toEqual(["bike"]);
  expect(searchIcons(index, "fridge bike").names).toEqual([]);
});

test("at most sixty are given, with how many matched", () => {
  const many = Array.from({ length: 75 }, (_, step): [string, string] => [`box-${step}`, ""]);
  const matches = searchIcons(many, "box");
  expect(matches.names).toHaveLength(shownAtMost);
  expect(matches.total).toBe(75);
});
