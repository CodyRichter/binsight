import { expect, test, type Page } from "@playwright/test";
import { addItem, addLocation, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

async function twoItemsInABin(page: Page) {
  const { ids } = await siteRoomBin(page.request);
  const word = uniqueName("Leftover");
  const first = `${word} lantern`;
  const second = `${word} tent`;
  const firstId = await addItem(page.request, first, ids.bin);
  const secondId = await addItem(page.request, second, ids.bin);
  return { ids, word, first, second, firstId, secondId };
}

async function selectAndPick(page: Page, names: string[], entry: string) {
  for (const name of names) await page.getByRole("checkbox", { name: `Select ${name}` }).check();
  const bar = page.getByRole("toolbar", { name: "Selected rows" });
  await bar.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: entry }).click();
}

async function moveTo(page: Page, placeName: string) {
  const sheet = page.getByRole("dialog", { name: "Move to" });
  await sheet.getByRole("textbox", { name: "Search locations" }).fill(placeName);
  await sheet.getByRole("button", { name: new RegExp(`^${placeName}`) }).click();
}

async function itemOf(page: Page, id: string) {
  const answer = await page.request.get(`/api/items/${id}`);
  return (await answer.json()) as {
    status: string;
    lent_to: string | null;
    path: { name: string }[];
  };
}

test("deleting two items from a bin at once, and Undo brings both back", async ({ page }) => {
  const { ids, first, second } = await twoItemsInABin(page);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await selectAndPick(page, [first, second], "Delete");
  await expect(page.getByRole("status").filter({ hasText: "Deleted 2 items" })).toBeVisible();
  await expect(page.getByRole("link", { name: first })).toHaveCount(0);
  await expect(page.getByRole("link", { name: second })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: first })).toBeVisible();
  await expect(page.getByRole("link", { name: second })).toBeVisible();
});

test("lending two search results to one person at once", async ({ page }) => {
  const { word, first, second, firstId, secondId } = await twoItemsInABin(page);
  const person = uniqueName("Dana");
  await openAtPhoneWidth(page, `/search?q=${encodeURIComponent(word)}`);
  await selectAndPick(page, [first, second], "Lend to…");
  const sheet = page.getByRole("dialog", { name: "Lent to" });
  await sheet.getByRole("textbox", { name: "Name" }).fill(person);
  await sheet.getByRole("button", { name: "Lend" }).click();
  await expect(page.getByText(`Lent 2 items to ${person}`)).toBeVisible();
  for (const id of [firstId, secondId]) {
    expect(await itemOf(page, id)).toMatchObject({ status: "lent_out", lent_to: person });
  }
});

test("moving a search result from the result list changes its path", async ({ page }) => {
  const { ids, word, first, firstId } = await twoItemsInABin(page);
  const otherName = uniqueName("Shelf");
  await addLocation(page.request, otherName, "shelf", ids.room);
  await openAtPhoneWidth(page, `/search?q=${encodeURIComponent(word)}`);
  await page.getByRole("button", { name: `Move ${first}` }).click();
  await moveTo(page, otherName);
  await expect(page.getByText(`Moved to ${otherName}`)).toBeVisible();
  await expect.poll(async () => (await itemOf(page, firstId)).path.at(-1)?.name).toBe(otherName);
});

test("a category picked once is listed first the next time", async ({ page }) => {
  const { firstId, secondId } = await twoItemsInABin(page);
  const category = uniqueName("Camping");
  await openAtPhoneWidth(page, `/items/${firstId}`);
  await page.getByRole("button", { name: "Category: Add" }).click();
  const sheet = page.getByRole("dialog", { name: "Category" });
  await sheet.getByRole("textbox", { name: "Category" }).fill(category);
  await sheet.getByRole("button", { name: `Make "${category}"` }).click();
  await expect(page.getByRole("status")).toContainText(`Category set to ${category}`);
  await page.goto(`/items/${secondId}`);
  await page.getByRole("button", { name: "Category: Add" }).click();
  await expect(sheet.getByRole("listitem").first()).toContainText(category);
});
