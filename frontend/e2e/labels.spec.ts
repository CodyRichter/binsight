import { expect, test, type Page } from "@playwright/test";
import { addItem, siteRoomBin } from "./homeData";
import { openAtPhoneWidth } from "./owner";

/** Expects the page header to hold this title with this large code chip beside it. */
async function expectTitle(page: Page, name: string, code: string) {
  const header = page.locator("#content header");
  await expect(header.locator("h1")).toHaveText(name);
  await expect(header.getByText(code, { exact: true })).toBeVisible();
}

test("a label opens its bin at its code, with the path, items and quick add in view", async ({
  page,
}) => {
  const { names, ids } = await siteRoomBin(page.request);
  await addItem(page.request, "HDMI cable", ids.bin);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/l/${ids.bin}`);
  await expect(page).toHaveURL(`/locations/${ids.bin}`);
  await expectTitle(page, names.bin, ids.bin);
  await expect(page.getByRole("navigation", { name: "Path" })).toHaveText(
    `${names.site}${names.room}`,
  );
  await expect(page.getByRole("link", { name: "HDMI cable" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add an item" })).toBeInViewport({ ratio: 1 });
});

test("a code typed by hand in lower case without the hyphen opens the same bin", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, `/l/${ids.bin.toLowerCase().replace("-", "")}`);
  await expect(page).toHaveURL(`/locations/${ids.bin}`);
});

test("an unknown code says nothing is there", async ({ page }) => {
  await openAtPhoneWidth(page, "/l/ZZZ-999");
  await expect(page.getByText("Nothing at this address")).toBeVisible();
  await expect(page.getByRole("link", { name: "Show all locations" })).toBeVisible();
});

test("tapping the code beside a location's name shows its label, which downloads as its code", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await expect(page.getByRole("button", { name: "Label", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: `Label ${ids.bin}` }).click();
  const sheet = page.getByRole("dialog", { name: "Label" });
  await expect(sheet.getByRole("img", { name: `Label ${ids.bin}` })).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Open to print" })).toHaveAttribute(
    "target",
    "_blank",
  );
  const download = page.waitForEvent("download");
  await sheet.getByRole("link", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toBe(`${ids.bin}.png`);
});
