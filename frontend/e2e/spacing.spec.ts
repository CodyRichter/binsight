import { expect, test } from "@playwright/test";
import {
  addItem,
  addLocation,
  addPhotoItem,
  makeLabels,
  siteRoomBin,
  uniqueName,
} from "./homeData";
import { box, open, settled } from "./measure";

test("an item row with a path is row-min plus its hairline", async ({ page }) => {
  const shed = uniqueName("Shed");
  await addPhotoItem(page.request, await addLocation(page.request, shed, "site"));
  await open(page, "/inbox");
  const row = page.locator("#content li").filter({ hasText: shed });
  expect((await box(row)).height).toBe(65);
});

test("a search result row with a path is row-min plus its hairline", async ({ page }) => {
  const shed = uniqueName("Shed");
  const shedId = await addLocation(page.request, shed, "site");
  const item = await addPhotoItem(page.request, shedId);
  const name = uniqueName("Torch");
  await page.request.patch(`/api/items/${item}`, { data: { name } });
  // Checked today, so no stale stamp joins the path beside Move.
  await page.request.post(`/api/locations/${shedId}/check`, { data: {} });
  await open(page, `/search?q=${encodeURIComponent(name)}`);
  const row = page.locator("#content li").filter({ hasText: name });
  expect((await box(row)).height).toBe(65);
});

test("a flat location row puts its type icon at the gutter", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  await open(page, `/locations/${ids.site}`);
  const locations = page.locator("#content section").filter({ hasText: "Locations" });
  expect((await box(locations.locator("li svg").first())).left).toBe(16);
});

test("a move sheet's rows are flat, touch-min plus a hairline, with the type icon at the gutter", async ({
  page,
}) => {
  const { ids, names } = await siteRoomBin(page.request);
  await open(page, `/locations/${ids.bin}`);
  await page.getByRole("button", { name: "Move", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Move to" });
  await sheet.getByRole("textbox", { name: "Search locations" }).fill(names.site);
  const row = sheet.locator("li").first();
  await settled(page);
  expect((await box(row)).height).toBe(49);
  expect((await box(row.locator("svg").first())).left).toBe(16);
});

test("a tree puts the top level's toggle glyph at the gutter", async ({ page }) => {
  await siteRoomBin(page.request);
  await open(page, "/");
  expect((await box(page.locator("#content li button svg").first())).left).toBe(16);
});

test("a claim row's add-inside glyph sits at the gutter", async ({ page }) => {
  await siteRoomBin(page.request);
  const [code = ""] = await makeLabels(page.request, 1);
  await open(page, `/l/${code}`);
  const addInside = page.getByRole("button", { name: /^Add location inside/ }).first();
  expect((await box(addInside.locator("svg"))).right).toBe(390 - 16);
});

test("a sheet's Close is touch-min with its glyph at the gutter", async ({ page }) => {
  await open(page, "/");
  await page.getByRole("button", { name: "Add location" }).click();
  const close = page.getByRole("dialog").locator(".mantine-Drawer-close");
  await settled(page);
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
