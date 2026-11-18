import { expect, test } from "@playwright/test";
import { openAtPhoneWidth } from "./owner";

test("back up now adds a backup to the top of the list in settings", async ({ page }) => {
  await openAtPhoneWidth(page, "/settings");
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Backups" }) });
  // Starting the app took the first backup.
  await expect(section.getByRole("listitem").first()).toBeVisible();
  const before = await section.getByRole("listitem").count();
  const taken = page.waitForResponse(
    (response) => response.url().endsWith("/api/backups") && response.request().method() === "POST",
  );
  await section.getByRole("button", { name: "Back up now" }).click();
  expect((await taken).status()).toBe(201);
  await expect(section.getByRole("listitem")).toHaveCount(Math.min(before + 1, 14));
});
