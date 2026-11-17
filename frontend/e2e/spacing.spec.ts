import { expect, test, type Locator, type Page } from "@playwright/test";

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

test("a location's page keeps its phone-width rhythm", async ({ page }) => {
  await open(page, "/design/browse/cables");
  expect((await box(page.locator("#content header"))).height).toBe(192);
  expect((await box(page.getByRole("button", { name: "Contents checked" }))).bottom).toBe(248);
  expect((await box(page.getByRole("textbox", { name: "Add an item" }).locator(".."))).bottom).toBe(
    320,
  );
  const items = page.locator("#content section").filter({ hasText: "Items" });
  expect(await box(items.locator("h2").locator(".."))).toMatchObject({ top: 376, bottom: 449 });
});

test("a flat location row puts its type icon at the gutter", async ({ page }) => {
  await open(page, "/design/browse/garage");
  const locations = page.locator("#content section").filter({ hasText: "Locations" });
  expect((await box(locations.locator("li svg").first())).left).toBe(16);
});

test("a tree puts the top level's toggle glyph at the gutter", async ({ page }) => {
  await open(page, "/design/browse");
  expect((await box(page.locator("#content li button svg").first())).left).toBe(16);
});

test("an item row with a path is row-min plus its hairline", async ({ page }) => {
  await open(page, "/design/list?q=hdmi");
  const row = page.locator("#content li").filter({ hasText: "HDMI cable" });
  expect((await box(row)).height).toBe(65);
});

test("a sheet's Close is touch-min with its glyph at the gutter", async ({ page }) => {
  await open(page, "/design/browse/cables");
  await page
    .getByRole("button", { name: /^Move / })
    .first()
    .click();
  const sheet = page.getByRole("dialog");
  const close = sheet.locator(".mantine-Drawer-close");
  expect((await box(close)).height).toBe(48);
  expect((await box(close.locator("svg"))).right).toBe(390 - 16);
  expect((await box(sheet.locator("li svg").first())).left).toBe(16);
});

test("only pages below a destination show Back", async ({ page }) => {
  await open(page, "/design/browse");
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
  await open(page, "/design/browse/cables");
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(1);
});

test("editable text inside a value row stays below its label when editing", async ({ page }) => {
  await open(page, "/design/record/hdmi-cable");
  const row = page.locator("#content li").filter({ hasText: "Category" });
  const label = await box(row.getByText("Category", { exact: true }));
  await row.getByRole("button", { name: "Category: Cables" }).click();
  const input = await box(row.getByRole("textbox", { name: "Category" }));
  expect(input.top).toBeGreaterThanOrEqual(label.bottom);
});

test("typing a multi-digit quantity expands the stepper input without clipping", async ({
  page,
}) => {
  await open(page, "/design/record/hdmi-cable");
  await page.getByRole("button", { name: "Quantity 3, type a number" }).click();
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
