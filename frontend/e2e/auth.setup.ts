import { expect, test as setup } from "@playwright/test";
import { openAtPhoneWidth, ownerPassword, ownerUsername, signedInState, signIn } from "./owner";

setup("the first visit makes the first admin and returns to the page", async ({ page }) => {
  await openAtPhoneWidth(page, "/settings");
  // A server kept running between local runs already has its first admin.
  const create = page.getByRole("button", { name: "Create account" });
  await expect(create.or(page.getByRole("button", { name: "Sign in" }))).toBeVisible();
  if (await create.isVisible()) {
    await page.getByLabel("Username").fill(ownerUsername);
    await page.getByLabel("Password", { exact: true }).fill(ownerPassword);
    await page.getByLabel("Repeat password").fill(ownerPassword);
    await create.click();
  } else {
    await signIn(page, ownerUsername, ownerPassword);
  }
  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await page.context().storageState({ path: signedInState });
});
