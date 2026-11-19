import { expect, test } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

test("lent to a name, returned, and Undo lends it again", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("Ladder");
  const person = uniqueName("Sam");
  await openAtPhoneWidth(page, `/items/${await addItem(page.request, name, ids.bin)}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Change status…" }).click();
  await page
    .getByRole("dialog", { name: "Change status" })
    .getByRole("button", { name: "Lend…" })
    .click();
  const sheet = page.getByRole("dialog", { name: "Lent to" });
  await sheet.getByRole("textbox", { name: "Name" }).fill(person);
  await sheet.getByRole("button", { name: "Lend", exact: true }).click();
  await expect(page.getByText(`Lent to ${person}`).first()).toBeVisible();
  await expect(page.getByRole("status")).toContainText(`Lent ${name} to ${person}`);
  await page.getByRole("button", { name: "Mark returned" }).click();
  const returned = page.getByRole("status").filter({ hasText: `Returned ${name}` });
  await expect(page.getByRole("button", { name: "Mark missing" })).toBeVisible();
  await returned.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Mark returned" })).toBeVisible();
});

test("a sold item leaves its bin, is still found, and comes back in place", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("Bike");
  const itemId = await addItem(page.request, name, ids.bin);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Change status…" }).click();
  await page
    .getByRole("dialog", { name: "Change status" })
    .getByRole("button", { name: "Sold" })
    .click();
  await expect(page.getByRole("status")).toContainText(`Marked ${name} sold`);
  await expect(page.getByText(/^Sold /)).toBeVisible();
  await page.goto(`/locations/${ids.bin}`);
  await expect(page.getByRole("link", { name })).toHaveCount(0);
  await page.goto(`/search?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
  await expect(page.getByText("Sold", { exact: true })).toBeVisible();
  await page.getByRole("link", { name }).click();
  await page.getByRole("button", { name: "Back in place" }).click();
  await expect(page.getByRole("status")).toContainText(`${name} is back in place`);
  await page.goto(`/locations/${ids.bin}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
});

test("two items linked as belonging together, unlinked, and Undo links them again", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const drill = uniqueName("Drill");
  const charger = uniqueName("Charger");
  const drillId = await addItem(page.request, drill, ids.bin);
  const chargerId = await addItem(page.request, charger, ids.bin);
  await openAtPhoneWidth(page, `/items/${chargerId}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Link an item" }).click();
  const sheet = page.getByRole("dialog", { name: "Link an item" });
  await sheet.getByRole("textbox", { name: "Search items" }).fill(drill);
  await sheet.getByRole("button", { name: drill }).click();
  await sheet.getByRole("button", { name: `Belongs with ${drill}` }).click();
  await expect(page.getByRole("status")).toContainText(`Linked ${drill}`);
  await expect(page.getByRole("link", { name: drill })).toBeVisible();
  await page.goto(`/items/${drillId}`);
  await expect(page.getByRole("heading", { name: "Belongs with" })).toBeVisible();
  await page.getByRole("button", { name: `Remove link to ${charger}` }).click();
  await expect(page.getByRole("link", { name: charger })).toHaveCount(0);
  const removed = page.getByRole("status").filter({ hasText: `Removed link to ${charger}` });
  await removed.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: charger })).toBeVisible();
});
