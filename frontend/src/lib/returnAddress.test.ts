import { expect, test } from "vitest";
import { gateAddress, returnAddress } from "./returnAddress";

test("the address asked for survives the trip through the Gate", () => {
  const asked = "/locations/abc?tab=history#top";
  const next = new URL(gateAddress(asked), "http://binsight.test").searchParams.get("next");
  expect(returnAddress(next)).toBe(asked);
});

test("the home page goes to the Gate with nothing to return to", () => {
  expect(gateAddress("/")).toBe("/login");
  expect(returnAddress(null)).toBe("/");
});

test.each(["//evil.example", "/\\evil.example", "https://evil.example/", "settings", "/login"])(
  "%s is not followed after sign-in",
  (next) => {
    expect(returnAddress(next)).toBe("/");
  },
);
