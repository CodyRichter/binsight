import { expect, test } from "@playwright/test";
import { box, open } from "./measure";

test("an item row with a path is row-min plus its hairline", async ({ page }) => {
  await open(page, "/design/list?q=hdmi");
  const row = page.locator("#content li").filter({ hasText: "HDMI cable" });
  expect((await box(row)).height).toBe(65);
});

test("refusal toast stays compact at phone width", async ({ page }) => {
  await open(page, "/design");
  await page.getByRole("button", { name: "Refusal toast" }).click();
  const toast = page.getByRole("alert");
  expect((await box(toast)).height).toBeLessThanOrEqual(68);
});
