import { expect, test, type Page } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

/** Adds a location from the page's Add location button, or from More on a room or bin with nothing inside. */
async function addLocationNamed(page: Page, name: string, fromMore = false) {
  if (fromMore) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("menuitem", { name: "Add location" }).click();
  } else {
    await page.getByRole("button", { name: "Add location" }).first().click();
  }
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Name").fill(name);
  await sheet.getByRole("button", { name: "Add" }).click();
}

function treeRow(page: Page, name: string) {
  return page.locator("#content li").filter({ has: page.getByRole("link", { name }) });
}

test("locations are added from the tree and from each location's page", async ({ page }) => {
  const [site, room, bin] = [uniqueName("Home"), uniqueName("Garage"), uniqueName("Cables")];
  await openAtPhoneWidth(page, "/");
  await addLocationNamed(page, site);
  await page.getByRole("link", { name: site }).click();
  await expect(page.getByRole("heading", { level: 1, name: site })).toBeVisible();

  await addLocationNamed(page, room);
  await page.getByRole("link", { name: room }).click();
  await addLocationNamed(page, bin, true);
  await expect(page.getByRole("link", { name: bin })).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: `Expand ${site}` }).click();
  await page.getByRole("button", { name: `Expand ${room}` }).click();
  for (const name of [site, room, bin]) {
    await expect(treeRow(page, name)).toHaveText(new RegExp(`^${name}[A-Z0-9]{3}-[A-Z0-9]{3}0$`));
  }
});

test("an item added in a bin shows at once and raises the counts", async ({ page }) => {
  const { names, ids } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await expect(page.getByText(`This bin is empty`)).toBeVisible();
  const field = page.getByRole("textbox", { name: "Add an item" });
  await field.fill("HDMI cable");
  await field.press("Enter");
  await expect(page.getByRole("link", { name: "HDMI cable" })).toBeVisible();
  await expect(field).toBeFocused();
  await expect(page.locator("#content header")).toContainText("1 item");

  await page.goto("/");
  await page.getByRole("button", { name: `Expand ${names.site}` }).click();
  await expect(treeRow(page, names.site)).toHaveText(`${names.site}${ids.site}1`);
  await expect(treeRow(page, names.room)).toHaveText(`${names.room}${ids.room}1`);
});

test("an item's page shows its path, and a burst of taps is one history entry", async ({
  page,
}) => {
  const { names, ids } = await siteRoomBin(page.request);
  const itemId = await addItem(page.request, "HDMI cable", ids.bin);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await expect(page.getByRole("navigation", { name: "Path" })).toHaveText(
    `${names.site}${names.room}${names.bin}`,
  );
  const more = page.getByRole("button", { name: "One more" });
  await more.click();
  await more.click();
  await expect(page.getByRole("button", { name: "Quantity 3, type a number" })).toBeVisible();

  const history = page.locator("#content section").filter({ hasText: "History" }).locator("li");
  await expect(history.first()).toContainText("Quantity changed from 1 to 3");
  await expect(history).toHaveCount(2);
  await expect(history.last()).toContainText("Added");
});

test("an unknown location's address says so inside the frame", async ({ page }) => {
  await openAtPhoneWidth(page, "/locations/made-up");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});
