import { expect, test } from "vitest";
import { addressOf, hasFilters, searchOf } from "./searchState";

test("a search's address holds its words and only the filters it uses", () => {
  const address = addressOf({ query: "hdmi", category: "Cables", tag: undefined });
  expect(address).toBe("/search?q=hdmi&category=Cables");
  expect(searchOf(new URLSearchParams(address.split("?")[1]))).toEqual({
    query: "hdmi",
    category: "Cables",
  });
});

test("an address with no filters has none", () => {
  const search = searchOf(new URLSearchParams("q=+drill+&sort=new"));
  expect(search).toEqual({ query: "drill" });
  expect(hasFilters(search)).toBe(false);
});
