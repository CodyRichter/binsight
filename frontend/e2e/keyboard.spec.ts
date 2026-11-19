import { expect, test, type Locator, type Page } from "@playwright/test";
import { addItem, addLocation, siteRoomBin, uniqueName } from "./homeData";

/** Presses a key until the target has focus, as someone without a pointer would. */
async function pressUntilFocused(page: Page, key: string, target: Locator) {
  for (let presses = 0; presses < 40; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  await expect(target).toBeFocused();
}

async function binWithTwoItems(page: Page) {
  const { ids } = await siteRoomBin(page.request);
  const word = uniqueName("Keys");
  const first = `${word} lantern`;
  const second = `${word} tent`;
  await addItem(page.request, first, ids.bin);
  await addItem(page.request, second, ids.bin);
  return { ids, word, first, second };
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test("the skip link is the first stop and moves focus to the content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Locations" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#content")).toBeFocused();
});

test("searching and opening a result by keyboard focuses its title", async ({ page }) => {
  const { word, first } = await binWithTwoItems(page);
  await page.goto("/");
  await pressUntilFocused(page, "Tab", page.getByRole("searchbox", { name: "Search" }));
  await page.keyboard.type(word);
  await pressUntilFocused(page, "Tab", page.getByRole("link", { name: first }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: first })).toBeFocused();
  await expect(page).toHaveTitle(`${first} – Binsight`);
});

test("moving an item and undoing it by keyboard", async ({ page }) => {
  const { ids, first } = await binWithTwoItems(page);
  const shelf = uniqueName("Shelf");
  await addLocation(page.request, shelf, "shelf", ids.room);
  await page.goto(`/locations/${ids.bin}`);
  await pressUntilFocused(page, "Tab", page.getByRole("button", { name: `Move ${first}` }));
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Move to" });
  await pressUntilFocused(page, "Tab", sheet.getByRole("textbox", { name: "Search locations" }));
  await page.keyboard.type(shelf);
  await pressUntilFocused(
    page,
    "Tab",
    sheet.getByRole("button", { name: new RegExp(`^${shelf}`) }),
  );
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: first })).toHaveCount(0);
  await pressUntilFocused(page, "Tab", page.getByRole("button", { name: "Undo" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: first })).toBeVisible();
});

test("Escape closes a sheet and gives focus back to what opened it", async ({ page }) => {
  const { ids, first } = await binWithTwoItems(page);
  await page.goto(`/locations/${ids.bin}`);
  const move = page.getByRole("button", { name: `Move ${first}` });
  await pressUntilFocused(page, "Tab", move);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Move to" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Move to" })).toBeHidden();
  await expect(move).toBeFocused();
});

test("ticking rows and choosing from the selection bar's menu by keyboard", async ({ page }) => {
  const { ids, first, second } = await binWithTwoItems(page);
  await page.goto(`/locations/${ids.bin}`);
  for (const name of [first, second]) {
    await pressUntilFocused(page, "Tab", page.getByRole("checkbox", { name: `Select ${name}` }));
    await page.keyboard.press("Space");
  }
  const bar = page.getByRole("toolbar", { name: "Selected rows" });
  await pressUntilFocused(page, "Tab", bar.getByRole("button", { name: "More", exact: true }));
  await page.keyboard.press("Enter");
  await pressUntilFocused(page, "ArrowDown", page.getByRole("menuitem", { name: "Lend to…" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Lent to" })).toBeVisible();
});
