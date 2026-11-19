import { expect, test } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

test("a serial number set on the item's page finds it in search", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("Drill");
  const serial = uniqueName("SN").replace(/\s/g, "");
  await openAtPhoneWidth(page, `/items/${await addItem(page.request, name, ids.bin)}`);
  await page.getByRole("button", { name: "Serial number: Add" }).click();
  const field = page.getByRole("textbox", { name: "Serial number" });
  await field.fill(serial);
  await field.press("Enter");
  await expect(page.getByRole("status")).toContainText("Changed serial number");
  await page.goto(`/search?q=${encodeURIComponent(serial)}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
});

test("a category made on one item is picked from the sheet on another", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const category = uniqueName("Tools");
  const first = await addItem(page.request, uniqueName("Drill"), ids.bin);
  const second = await addItem(page.request, uniqueName("Saw"), ids.bin);
  await openAtPhoneWidth(page, `/items/${first}`);
  await page.getByRole("button", { name: "Category: Add" }).click();
  const sheet = page.getByRole("dialog", { name: "Category" });
  await sheet.getByRole("textbox", { name: "Category" }).fill(category);
  await sheet.getByRole("button", { name: `Make "${category}"` }).click();
  await expect(page.getByRole("button", { name: `Category: ${category}` })).toBeVisible();
  await page.goto(`/items/${second}`);
  await page.getByRole("button", { name: "Category: Add" }).click();
  await page
    .getByRole("dialog", { name: "Category" })
    .getByRole("button", { name: category, exact: true })
    .click();
  await expect(page.getByRole("button", { name: `Category: ${category}` })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(`Category set to ${category}`);
});

test("a tag is added and removed, and Undo brings it back", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const tag = uniqueName("usb").toLowerCase().replace(/\s/g, "-");
  await openAtPhoneWidth(page, `/items/${await addItem(page.request, uniqueName("Hub"), ids.bin)}`);
  await page.getByRole("button", { name: "Add tag" }).click();
  const sheet = page.getByRole("dialog", { name: "Add tag" });
  await sheet.getByRole("textbox", { name: "Tag" }).fill(tag);
  await sheet.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("link", { name: tag })).toBeVisible();
  await page.getByRole("button", { name: `Remove tag ${tag}` }).click();
  await expect(page.getByRole("link", { name: tag })).toHaveCount(0);
  const removed = page.getByRole("status").filter({ hasText: `Removed tag ${tag}` });
  await removed.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: tag })).toBeVisible();
});

test("a warranty date is still there after a reload", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  await openAtPhoneWidth(
    page,
    `/items/${await addItem(page.request, uniqueName("Kettle"), ids.bin)}`,
  );
  await page.getByRole("button", { name: "Warranty ends: Add" }).click();
  const field = page.getByLabel("Warranty ends");
  await field.fill("2027-03-01");
  await field.press("Enter");
  await expect(page.getByRole("status")).toContainText("Changed warranty ends");
  await page.reload();
  await expect(page.getByRole("button", { name: /^Warranty ends: (?!empty)/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /2027/ })).toBeVisible();
});
