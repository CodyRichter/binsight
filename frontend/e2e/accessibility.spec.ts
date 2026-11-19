import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

const standards = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Every WCAG 2.1 A and AA rule axe finds broken on the page as it stands, one line each. */
async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(standards).analyze();
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.html} — ${node.failureSummary}`),
  );
}

async function home(page: Page) {
  const { ids } = await siteRoomBin(page.request);
  const word = uniqueName("Audit");
  const itemId = await addItem(page.request, `${word} lantern`, ids.bin);
  const lentId = await addItem(page.request, `${word} tent`, ids.bin);
  await page.request.post(`/api/items/${lentId}/lend`, { data: { lent_to: "Dana" } });
  return { ids, word, itemId };
}

async function pages(page: Page): Promise<string[]> {
  const { ids, word, itemId } = await home(page);
  return [
    "/",
    `/locations/${ids.bin}`,
    `/items/${itemId}`,
    `/search?q=${encodeURIComponent(word)}`,
    "/search",
    "/views",
    "/views/lent-out",
    "/inbox",
    "/scan",
    "/settings",
    "/insurance",
    `/locations/${ids.bin}/sheet`,
    "/nowhere",
  ];
}

async function auditPages(page: Page) {
  const found: Record<string, string[]> = {};
  for (const path of await pages(page)) {
    await openAtPhoneWidth(page, path);
    await expect(page.locator("h1")).toBeVisible();
    const broken = await violations(page);
    if (broken.length > 0) found[path] = broken;
  }
  expect(found).toEqual({});
}

async function auditLocationOverlays(page: Page) {
  const { ids, word } = await home(page);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  const navigation = page.getByRole("navigation", { name: "Main" });
  await navigation.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add" })).toBeVisible();
  expect(await violations(page), "Add").toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: `Move ${word} lantern` }).click();
  await expect(page.getByRole("dialog", { name: "Move to" })).toBeVisible();
  expect(await violations(page), "Move").toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Change type and icon" }).click();
  await expect(page.getByRole("dialog", { name: "Type and icon" })).toBeVisible();
  expect(await violations(page), "Type and icon").toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("checkbox", { name: `Select ${word} lantern` }).check();
  const bar = page.getByRole("toolbar", { name: "Selected rows" });
  await bar.getByRole("button", { name: "More", exact: true }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  expect(await violations(page), "Selection bar").toEqual([]);
}

async function auditItemOverlays(page: Page) {
  const { itemId } = await home(page);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await page.getByRole("button", { name: "Category: Add a category" }).click();
  const sheet = page.getByRole("dialog", { name: "Category" });
  await expect(sheet).toBeVisible();
  expect(await violations(page), "Category").toEqual([]);
  await sheet.getByRole("textbox", { name: "Category" }).fill(uniqueName("Camping"));
  await sheet.getByRole("button", { name: /^Make/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Category set to" })).toBeVisible();
  expect(await violations(page), "Toast").toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`in ${colorScheme} mode`, () => {
    // Sheets open without sliding, so colors are measured as they settle rather than mid-fade.
    test.use({ colorScheme, reducedMotion: "reduce" });

    test("every page meets WCAG 2.1 AA", async ({ page }) => auditPages(page));

    test("the side navigation at desktop width meets WCAG 2.1 AA", async ({ page }) => {
      const { ids } = await home(page);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/locations/${ids.bin}`);
      await expect(page.getByRole("navigation").first()).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test("the sign-in page meets WCAG 2.1 AA", async ({ browser }) => {
      const signedOut = { cookies: [], origins: [] };
      const context = await browser.newContext({ colorScheme, storageState: signedOut });
      const page = await context.newPage();
      await openAtPhoneWidth(page, "/login");
      await expect(page.locator("h1")).toBeVisible();
      expect(await violations(page)).toEqual([]);
      await context.close();
    });

    test("a location's sheets and selection bar meet WCAG 2.1 AA", async ({ page }) =>
      auditLocationOverlays(page));

    test("an item's category sheet and its toast meet WCAG 2.1 AA", async ({ page }) =>
      auditItemOverlays(page));
  });
}
