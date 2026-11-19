import { expect, test } from "vitest";
import { pathSegments } from "./pathSegments";

test("a path reads by name and links to each location by its code", () => {
  const path = [
    { id: "K7Q-4MZ", name: "Home", type: "site" },
    { id: "B2R-W9T", name: "Cables", type: "bin" },
  ] as const;
  expect(pathSegments([...path])).toEqual([
    { name: "Home", to: "/locations/K7Q-4MZ" },
    { name: "Cables", to: "/locations/B2R-W9T" },
  ]);
});
