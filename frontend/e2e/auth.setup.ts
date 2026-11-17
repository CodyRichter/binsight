import { expect, test as setup } from "@playwright/test";
import { openAtPhoneWidth, ownerPassword, signedInState } from "./owner";

setup("the first visit sets the owner's password and returns to the page", async ({ page }) => {
  await openAtPhoneWidth(page, "/settings");
  await page.getByLabel("Password", { exact: true }).fill(ownerPassword);
  // A server kept running between local runs already has its owner.
  const repeat = page.getByLabel("Repeat password");
  if (await repeat.isVisible()) {
    await repeat.fill(ownerPassword);
    await page.getByRole("button", { name: "Set password" }).click();
  } else {
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await page.context().storageState({ path: signedInState });
});
