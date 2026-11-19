import { expect, test } from "vitest";
import { labelCode } from "./labelCode";

test("a label's address gives its code", () => {
  expect(labelCode("https://binsight.example/l/K7Q-4MZ")).toBe("K7Q-4MZ");
  expect(labelCode("http://192.168.1.20:8000/l/B2R-W9T/")).toBe("B2R-W9T");
});

test("anything else is not a label", () => {
  expect(labelCode("https://example.com/items/K7Q-4MZ")).toBeNull();
  expect(labelCode("K7Q-4MZ")).toBeNull();
  expect(labelCode("WIFI:S:home;T:WPA;P:secret;;")).toBeNull();
});
