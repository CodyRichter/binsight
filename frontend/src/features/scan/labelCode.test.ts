import { expect, test } from "vitest";
import { labelCode } from "./labelCode";

test("a label's address gives its code", () => {
  expect(labelCode("https://binsight.example/l/B-014")).toBe("B-014");
  expect(labelCode("http://192.168.1.20:8000/l/B-015/")).toBe("B-015");
});

test("anything else is not a label", () => {
  expect(labelCode("https://example.com/items/B-014")).toBeNull();
  expect(labelCode("B-014")).toBeNull();
  expect(labelCode("WIFI:S:home;T:WPA;P:secret;;")).toBeNull();
});
