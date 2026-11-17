import { expect, test } from "@playwright/test";
import { openAtPhoneWidth } from "./owner";

test("the built app leaves out the design language's pages", async ({ page }) => {
  await openAtPhoneWidth(page, "/design");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
});
