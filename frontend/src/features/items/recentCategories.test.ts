import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "@/lib/testing/memoryStorage";
import { recentCategories, recentFirst, rememberCategory } from "./recentCategories";

const categories = [
  { name: "Tools", item_count: 9 },
  { name: "Cables", item_count: 5 },
  { name: "Camping", item_count: 2 },
];

describe("recent categories", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));

  it("keeps the five picked most recently, newest first, each once", () => {
    for (const name of ["A", "B", "C", "D", "E", "B", "F"]) rememberCategory(name);
    expect(recentCategories()).toEqual(["F", "B", "E", "D", "C"]);
  });

  it("puts recent categories first and leaves the rest in their order", () => {
    const names = recentFirst(categories, ["Camping", "Gone"]).map((each) => each.name);
    expect(names).toEqual(["Camping", "Tools", "Cables"]);
  });
});
