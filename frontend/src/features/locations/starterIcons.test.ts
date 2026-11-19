import iconIndex from "virtual:icon-index";
import { expect, test } from "vitest";
import { starterIcons } from "./starterIcons";

test("every starter icon is one of Tabler's outline icons", () => {
  const names = new Set(iconIndex.map(([name]) => name));
  expect(starterIcons.filter((name) => !names.has(name))).toEqual([]);
});
