import { expect, test } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

test("deleting an item from its page lands on its bin without it, and Undo brings it back", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("USB-C charger");
  const itemId = await addItem(page.request, name, ids.bin);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete item" }).click();
  await expect(page).toHaveURL(`/locations/${ids.bin}`);
  await expect(page.getByRole("link", { name })).toHaveCount(0);
  await expect(page.getByText(`Deleted ${name}`)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name })).toBeVisible();
});

test("a deleted item's page says so, and Restore puts it back in its bin", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("HDMI cable");
  const itemId = await addItem(page.request, name, ids.bin);
  await page.request.delete(`/api/items/${itemId}`);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await expect(page.getByText("Deleted today")).toBeVisible();
  await expect(page.getByRole("button", { name: "Move" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "More", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText(`Restored ${name}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Move" })).toBeVisible();
  const history = page.locator("#content section").filter({ hasText: "History" }).locator("li");
  await expect(history.first()).toContainText("Restored");
  await page.goto(`/locations/${ids.bin}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
});
