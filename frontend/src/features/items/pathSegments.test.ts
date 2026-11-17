import { expect, test } from "vitest";
import { pathSegments } from "./pathSegments";

test("a labeled location reads by its type and code, others by name", () => {
  const path = [
    { id: "home", name: "Home", type: "site", label_code: null },
    { id: "cables", name: "Cables", type: "bin", label_code: "B-014" },
  ] as const;
  expect(pathSegments([...path])).toEqual([
    { name: "Home", to: "/locations/home" },
    { name: "Bin B-014", to: "/locations/cables" },
  ]);
});
