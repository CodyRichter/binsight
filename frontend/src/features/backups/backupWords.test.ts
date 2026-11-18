import { expect, test } from "vitest";
import { sizeText } from "./backupWords";

test("sizes read in the largest unit that keeps the number small", () => {
  expect(sizeText(512)).toBe("512 bytes");
  expect(sizeText(820_000)).toBe("820 KB");
  expect(sizeText(12_430_000)).toBe("12.4 MB");
  expect(sizeText(3_000_000_000)).toBe("3 GB");
});
