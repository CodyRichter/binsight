import { expect, test } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";

type Box = { y: number; height: number } | null;
const middle = (box: Box) => (box ? box.y + box.height / 2 : 0);
const bottom = (box: Box) => (box ? box.y + box.height : 0);

const pane = (page: import("@playwright/test").Page) =>
  page.getByRole("complementary", { name: "Locations" });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("a location's page lights it in the pane, and a pane row opens its location", async ({
  page,
}) => {
  const { names, ids } = await siteRoomBin(page.request);
  await page.goto(`/locations/${ids.bin}`);
  await expect(pane(page).getByRole("link", { name: names.bin })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await pane(page).getByRole("link", { name: names.room }).click();
  await expect(page.getByRole("heading", { level: 1, name: names.room })).toBeVisible();
});

test("an item's page lights its home in the pane and puts its sections side by side", async ({
  page,
}) => {
  const { names, ids } = await siteRoomBin(page.request);
  const name = uniqueName("Drill");
  const item = await addItem(page.request, name, ids.bin);
  await page.goto(`/items/${item}`);
  await expect(pane(page).getByRole("link", { name: names.bin })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const details = await page.getByRole("heading", { name: "Details" }).boundingBox();
  const history = await page.getByRole("heading", { name: "History" }).boundingBox();
  expect(history?.x).toBeGreaterThan((details?.x ?? 0) + (details?.width ?? 0));
});

test("the home page, already the tree, has no pane", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Locations" })).toBeVisible();
  await expect(pane(page)).toHaveCount(0);
});

test("at phone width there is no pane, and an item's sections stack", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const item = await addItem(page.request, uniqueName("Drill"), ids.bin);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`/items/${item}`);
  const details = await page.getByRole("heading", { name: "Details" }).boundingBox();
  const history = await page.getByRole("heading", { name: "History" }).boundingBox();
  expect(history?.y).toBeGreaterThan(details?.y ?? 0);
  expect(history?.x).toBe(details?.x);
  await expect(pane(page)).toHaveCount(0);
});

test("beside the pane only the pane's row is lit, and the pane starts under the top bar", async ({
  page,
}) => {
  const { names, ids } = await siteRoomBin(page.request);
  await page.goto(`/locations/${ids.bin}`);
  await expect(pane(page).getByRole("link", { name: names.bin })).toBeVisible();
  const lit = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.background = "var(--bs-highlight)";
    document.body.append(probe);
    const highlight = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const shown = document.querySelectorAll("nav[aria-label='Main'] *, aside *");
    return [...shown].filter((each) => getComputedStyle(each).backgroundColor === highlight).length;
  });
  expect(lit).toBe(1);
  const bar = await page.getByRole("banner").boundingBox();
  expect((await pane(page).boundingBox())?.y).toBe(bottom(bar));
  const listStart = await pane(page).evaluate((aside) => {
    const list = aside.querySelector("ul");
    const top = list ? list.getBoundingClientRect().top : Number.NaN;
    return top - aside.getBoundingClientRect().top + aside.scrollTop;
  });
  expect(listStart).toBe(0);
});

test("a location's actions sit on its title's row, and Add sits inside the add bar", async ({
  page,
}) => {
  const { names, ids } = await siteRoomBin(page.request);
  await page.goto(`/locations/${ids.bin}`);
  const title = await page.getByRole("heading", { level: 1, name: names.bin }).boundingBox();
  const action = await page.getByRole("button", { name: "Move", exact: true }).boundingBox();
  expect(action?.y).toBeLessThan(bottom(title));
  const field = await page.getByRole("textbox", { name: "Add an item" }).boundingBox();
  const add = await page.getByRole("button", { name: "Add", exact: true }).last().boundingBox();
  expect(Math.abs(middle(add) - middle(field))).toBeLessThan(2);
});

test("collapsing the navigation widens the page, and stays collapsed after a reload", async ({
  page,
}) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1, name: "Locations" });
  const before = await heading.boundingBox();
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  const after = await heading.boundingBox();
  expect(after?.x).toBeLessThan(before?.x ?? 0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Expand navigation" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Home" }),
  ).toBeVisible();
});

test("selecting items floats a shadowed bar over the items' column, clear of the pane", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("Drill");
  await addItem(page.request, name, ids.bin);
  await page.goto(`/locations/${ids.bin}`);
  await page.getByRole("checkbox", { name: `Select ${name}` }).check();
  const bar = page.getByRole("toolbar", { name: "Selected rows" });
  await expect(bar).toContainText("1 selected");
  const barBox = await bar.boundingBox();
  const paneBox = await pane(page).boundingBox();
  expect(barBox?.x).toBeGreaterThanOrEqual((paneBox?.x ?? 0) + (paneBox?.width ?? 0));
  expect((barBox?.x ?? 0) + (barBox?.width ?? 0)).toBeLessThanOrEqual(1440);
  expect(await bar.evaluate((each) => getComputedStyle(each).boxShadow)).not.toBe("none");
});
