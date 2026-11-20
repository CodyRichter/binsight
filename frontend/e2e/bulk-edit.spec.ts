import { expect, test, type Page } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

async function twoItemsInABin(page: Page) {
  const { names, ids } = await siteRoomBin(page.request);
  const word = uniqueName("Bulk");
  const first = `${word} cable`;
  const second = `${word} charger`;
  const firstId = await addItem(page.request, first, ids.bin);
  const secondId = await addItem(page.request, second, ids.bin);
  return { names, ids, word, first, second, firstId, secondId };
}

async function select(page: Page, ...names: string[]) {
  for (const name of names) await page.getByRole("checkbox", { name: `Select ${name}` }).check();
  await expect(page.getByRole("toolbar", { name: "Selected rows" })).toContainText(
    `${names.length} selected`,
  );
}

function bar(page: Page) {
  return page.getByRole("toolbar", { name: "Selected rows" });
}

function toast(page: Page, words: string) {
  return page.getByRole("status").filter({ hasText: words });
}

test("selecting items in a bin floats the bar above the bottom bar, and Close ends it", async ({
  page,
}) => {
  const { ids, first } = await twoItemsInABin(page);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  const navigation = page.getByRole("navigation", { name: "Main" });
  await expect(navigation).toBeVisible();
  await select(page, first);
  await expect(navigation).toBeVisible();
  const barBox = await bar(page).boundingBox();
  const navigationBox = await navigation.boundingBox();
  expect((barBox?.y ?? 0) + (barBox?.height ?? 0)).toBeLessThan(navigationBox?.y ?? 0);
  await bar(page).getByRole("button", { name: "Close" }).click();
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: `Select ${first}` })).not.toBeChecked();
});

test("moving two items from a bin at once, and Undo puts both back", async ({ page }) => {
  const { ids, first, second } = await twoItemsInABin(page);
  const otherName = uniqueName("Tools");
  const other = await page.request.post("/api/locations", {
    data: { name: otherName, type: "bin", parent_id: ids.room },
  });
  const otherId = ((await other.json()) as { id: string }).id;
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await select(page, first, second);
  await bar(page).getByRole("button", { name: "Move" }).click();
  const sheet = page.getByRole("dialog", { name: "Move 2 items to" });
  await sheet.getByRole("textbox", { name: "Search locations" }).fill(otherName);
  await sheet.getByRole("button", { name: new RegExp(`^${otherName}`) }).click();
  await expect(toast(page, `Moved 2 items to ${otherName}`)).toBeVisible();
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: first })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: first })).toBeVisible();
  await expect(page.getByRole("link", { name: second })).toBeVisible();
  await page.goto(`/locations/${otherId}`);
  await expect(page.getByRole("link", { name: first })).toHaveCount(0);
});

test("tagging search results, and the tag shows on each item's page", async ({ page }) => {
  const { word, first, second, firstId, secondId } = await twoItemsInABin(page);
  const tag = uniqueName("camping").toLowerCase();
  await openAtPhoneWidth(page, `/search?q=${encodeURIComponent(word)}`);
  await select(page, first, second);
  await bar(page).getByRole("button", { name: "Tag" }).click();
  await page
    .getByRole("dialog", { name: "Add tag" })
    .getByRole("textbox", { name: "Tag" })
    .fill(tag);
  await page.getByRole("dialog", { name: "Add tag" }).getByRole("button", { name: "Add" }).click();
  await expect(toast(page, `Tagged 2 items ${tag}`)).toBeVisible();
  for (const id of [firstId, secondId]) {
    await page.goto(`/items/${id}`);
    await expect(page.getByText(tag, { exact: true })).toBeVisible();
  }
});

test("giving lent-out items a category from their view", async ({ page }) => {
  const { first, second, firstId, secondId } = await twoItemsInABin(page);
  for (const id of [firstId, secondId]) {
    await page.request.post(`/api/items/${id}/lend`, { data: { lent_to: "Dana" } });
  }
  const category = uniqueName("Camping gear");
  await openAtPhoneWidth(page, "/views/lent-out");
  await select(page, first, second);
  await bar(page).getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Change category…" }).click();
  const sheet = page.getByRole("dialog", { name: "Category" });
  await sheet.getByRole("textbox", { name: "Category" }).fill(category);
  await sheet.getByRole("button", { name: `Make "${category}"` }).click();
  await expect(toast(page, `Changed the category of 2 items to ${category}`)).toBeVisible();
  await page.goto(`/items/${firstId}`);
  await expect(page.getByText(category, { exact: true })).toBeVisible();
});

test("marking searched items sold moves them into the archive view", async ({ page }) => {
  const { word, first, second } = await twoItemsInABin(page);
  await openAtPhoneWidth(page, `/search?q=${encodeURIComponent(word)}`);
  await select(page, first, second);
  await bar(page).getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Sold" }).click();
  await expect(toast(page, "Marked 2 items sold")).toBeVisible();
  await page.goto("/views/archive");
  await expect(page.getByRole("link", { name: first })).toBeVisible();
  await expect(page.getByRole("link", { name: second })).toBeVisible();
});

test("giving inbox items a home at once takes them out of the inbox", async ({ page }) => {
  const { names } = await siteRoomBin(page.request);
  const word = uniqueName("Unsorted");
  const loose = [`${word} tape`, `${word} glue`];
  for (const name of loose) await page.request.post("/api/items", { data: { name } });
  await openAtPhoneWidth(page, "/inbox");
  await select(page, ...loose);
  await bar(page).getByRole("button", { name: "Move" }).click();
  const sheet = page.getByRole("dialog", { name: "Move 2 items to" });
  await sheet.getByRole("textbox", { name: "Search locations" }).fill(names.bin);
  await sheet.getByRole("button", { name: new RegExp(`^${names.bin}`) }).click();
  await expect(toast(page, `Moved 2 items to ${names.bin}`)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: loose[0] })).toHaveCount(0);
});
