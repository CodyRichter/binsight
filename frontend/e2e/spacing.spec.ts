import { expect, test, type Locator, type Page } from "@playwright/test";
import { addItem, siteRoomBin } from "./homeData";

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error("Not on screen");
  return {
    left: found.x,
    top: found.y,
    right: found.x + found.width,
    bottom: found.y + found.height,
    height: found.height,
  };
}

async function open(page: Page, path: string) {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

test("a flat location row puts its type icon at the gutter", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  await open(page, `/locations/${ids.site}`);
  const locations = page.locator("#content section").filter({ hasText: "Locations" });
  expect((await box(locations.locator("li svg").first())).left).toBe(16);
});

test("a tree puts the top level's toggle glyph at the gutter", async ({ page }) => {
  await siteRoomBin(page.request);
  await open(page, "/");
  expect((await box(page.locator("#content li button svg").first())).left).toBe(16);
});

test("an item row with a path is row-min plus its hairline", async ({ page }) => {
  await open(page, "/design/list?q=hdmi");
  const row = page.locator("#content li").filter({ hasText: "HDMI cable" });
  expect((await box(row)).height).toBe(65);
});

test("a sheet's Close is touch-min with its glyph at the gutter", async ({ page }) => {
  await open(page, "/");
  await page.getByRole("button", { name: "Add location" }).click();
  const close = page.getByRole("dialog").locator(".mantine-Drawer-close");
  expect((await box(close)).height).toBe(48);
  expect((await box(close.locator("svg"))).right).toBe(390 - 16);
});

test("only pages below a destination show Back", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  await open(page, "/");
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
  await open(page, `/locations/${ids.bin}`);
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(1);
});

test("typing a multi-digit quantity expands the stepper input without clipping", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  await open(page, `/items/${await addItem(page.request, "HDMI cable", ids.bin)}`);
  await page.getByRole("button", { name: "Quantity 1, type a number" }).click();
  const input = page.getByRole("textbox", { name: "Quantity" });
  await input.fill("12345");
  const overflows = await input.evaluate((node) => node.scrollWidth > node.clientWidth);
  expect(overflows).toBe(false);
});

test("refusal toast stays compact at phone width", async ({ page }) => {
  await open(page, "/design");
  await page.getByRole("button", { name: "Refusal toast" }).click();
  const toast = page.getByRole("alert");
  expect((await box(toast)).height).toBeLessThanOrEqual(68);
});
