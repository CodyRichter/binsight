import { expect, test } from "vitest";
import { locationCode } from "./locationCode";

test("a code is read in any case, with or without the hyphen", () => {
  expect(locationCode("K7Q-4MZ")).toBe("K7Q-4MZ");
  expect(locationCode(" k7q4mz ")).toBe("K7Q-4MZ");
});

test("anything else is not a code", () => {
  expect(locationCode("Shelf 2")).toBeNull();
  expect(locationCode("K7Q-4M")).toBeNull();
  expect(locationCode("")).toBeNull();
});
