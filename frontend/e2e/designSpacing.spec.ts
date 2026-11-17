import { expect, test } from "@playwright/test";
import { box, open } from "./measure";

test("refusal toast stays compact at phone width", async ({ page }) => {
  await open(page, "/design");
  await page.getByRole("button", { name: "Refusal toast" }).click();
  const toast = page.getByRole("alert");
  expect((await box(toast)).height).toBeLessThanOrEqual(68);
});
