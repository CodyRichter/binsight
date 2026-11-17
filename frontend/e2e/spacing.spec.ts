import { expect, test } from "@playwright/test";
import { addItem, siteRoomBin } from "./homeData";
import { box, open } from "./measure";

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
