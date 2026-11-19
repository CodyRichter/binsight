import { expect, test, type Page } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

async function fromMore(page: Page, entry: string) {
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: entry }).click();
}

test("duplicating an item opens a copy with its name and details, and Undo removes it", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("Cordless drill");
  const itemId = await addItem(page.request, name, ids.bin);
  await page.request.patch(`/api/items/${itemId}`, { data: { brand: "Makita" } });
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await fromMore(page, "Duplicate");
  await expect(page.getByText(`Duplicated ${name}`)).toBeVisible();
  await expect(page).not.toHaveURL(`/items/${itemId}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Makita")).toBeVisible();
  // Nothing on the copy's page changes once it is undone, so wait for the answer before leaving.
  const undone = page.waitForResponse((answer) => answer.url().endsWith("/undo"));
  await page.getByRole("button", { name: "Undo" }).click();
  await undone;
  await page.goto(`/locations/${ids.bin}`);
  await expect(page.getByRole("link", { name })).toHaveCount(1);
});

test("merging an item recorded twice adds its count to the other, and Undo separates them", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("AA batteries");
  const first = await addItem(page.request, name, ids.bin);
  const second = await addItem(page.request, name, ids.bin);
  await page.request.patch(`/api/items/${first}`, { data: { quantity: 4 } });
  await page.request.patch(`/api/items/${second}`, { data: { quantity: 8 } });
  await openAtPhoneWidth(page, `/items/${first}`);
  await fromMore(page, "Merge into…");
  const sheet = page.getByRole("dialog", { name: "Merge into" });
  await sheet.getByRole("textbox", { name: "Search items" }).fill(name);
  await sheet.getByRole("button", { name }).click();
  await expect(page.getByText(`Merged ${name} into ${name}`)).toBeVisible();
  await expect(page).toHaveURL(`/items/${second}`);
  await expect(page.getByRole("button", { name: "Quantity 12, type a number" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Quantity 8, type a number" })).toBeVisible();
  await page.goto(`/locations/${ids.bin}`);
  await expect(page.getByRole("link", { name })).toHaveCount(2);
});
