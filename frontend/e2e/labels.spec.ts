import { expect, test, type Page } from "@playwright/test";
import { addItem, claim, makeLabels, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

/** Expects the page header to hold this title with this large code chip beside it. */
async function expectTitle(page: Page, name: string, code: string) {
  const header = page.locator("#content header");
  await expect(header.locator("h1")).toHaveText(name);
  await expect(header.getByText(code, { exact: true })).toBeVisible();
}

test("a claimed label opens its bin with the path, items and quick add in view", async ({
  page,
}) => {
  const { names, ids } = await siteRoomBin(page.request);
  await addItem(page.request, "HDMI cable", ids.bin);
  const [code = ""] = await makeLabels(page.request, 1);
  await claim(page.request, code, ids.bin);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/l/${code}`);
  await expectTitle(page, names.bin, code);
  await expect(page.getByRole("navigation", { name: "Path" })).toHaveText(
    `${names.site}${names.room}`,
  );
  await expect(page.getByRole("link", { name: "HDMI cable" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add an item" })).toBeInViewport({ ratio: 1 });
});

test("a blank label is claimed by tapping a location, and Undo makes it blank again", async ({
  page,
}) => {
  const { names } = await siteRoomBin(page.request);
  const [code = ""] = await makeLabels(page.request, 1);
  await openAtPhoneWidth(page, `/l/${code}`);
  await expectTitle(page, "Blank label", code);
  await page.getByRole("button", { name: names.site, exact: true }).click();
  await expectTitle(page, names.site, code);
  await expect(page).toHaveURL(`/l/${code}`);
  await page.getByRole("button", { name: "Undo" }).click();
  await expectTitle(page, "Blank label", code);
});

test("a blank label is claimed for a new location made inside another", async ({ page }) => {
  const { names } = await siteRoomBin(page.request);
  const [code = ""] = await makeLabels(page.request, 1);
  const drawer = uniqueName("Drawer");
  await openAtPhoneWidth(page, `/l/${code}`);
  await page.getByRole("button", { name: `Add location inside ${names.site}` }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Name").fill(drawer);
  await sheet.getByRole("button", { name: "Add" }).click();
  await expectTitle(page, drawer, code);
  await expect(page.getByRole("navigation", { name: "Path" })).toHaveText(names.site);
});

test("an unknown code says no label has it", async ({ page }) => {
  await openAtPhoneWidth(page, "/l/B-9999");
  await expect(page.getByText("No label has the code B-9999")).toBeVisible();
  await expect(page.getByRole("link", { name: "Show all locations" })).toBeVisible();
});

test("blank labels are made in Settings and each downloads as a PNG", async ({ page }) => {
  await openAtPhoneWidth(page, "/settings");
  await page.getByRole("button", { name: "Make blank labels" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("How many").fill("3");
  const answer = page.waitForResponse("**/api/labels/blank");
  await sheet.getByRole("button", { name: "Make" }).click();
  const made = (await (await answer).json()) as { labels: { code: string }[] };
  const codes = made.labels.map((label) => label.code);
  expect(codes).toHaveLength(3);
  const rows = codes.map((code) => page.locator("#content li").filter({ hasText: code }));
  for (const row of rows) await expect(row).toContainText("Blank");
  const download = page.waitForEvent("download");
  await rows[0]?.getByRole("link", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toBe(`${codes[0]}.png`);
});

test("a labeled location's More menu downloads its label", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const [code = ""] = await makeLabels(page.request, 1);
  await claim(page.request, code, ids.bin);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await page.getByRole("button", { name: "More" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Download label" }).click();
  expect((await download).suggestedFilename()).toBe(`${code}.png`);
});
