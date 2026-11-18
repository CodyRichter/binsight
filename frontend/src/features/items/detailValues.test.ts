import { expect, test } from "vitest";
import { centsFrom, dateText, priceText } from "./detailValues";

test("a typed price becomes whole cents", () => {
  expect(centsFrom("24.99")).toBe(2499);
  expect(centsFrom("24")).toBe(2400);
  expect(centsFrom("1,299.5")).toBe(129950);
  expect(centsFrom("0.05")).toBe(5);
  expect(centsFrom("$24")).toBe(2400);
});

test("what isn't a price is refused", () => {
  expect(centsFrom("abc")).toBeUndefined();
  expect(centsFrom("1.999")).toBeUndefined();
  expect(centsFrom("-3")).toBeUndefined();
});

test("cents read back as the price typed", () => {
  expect(priceText(2499)).toBe("24.99");
  expect(priceText(null)).toBe("");
});

test("a date reads as that same day wherever the owner is", () => {
  expect(dateText("2027-03-01")).toBe(
    new Date(2027, 2, 1).toLocaleDateString(undefined, { dateStyle: "medium" }),
  );
  expect(dateText(null)).toBeUndefined();
});
