import { expect, test, type Locator, type Page } from "@playwright/test";
import { addItem, addPhotoItem, claim, makeLabels, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

/** Flow 3's home: Cables, with its label, holding a photographed HDMI cable and a charger. */
async function cablesBin(page: Page) {
  const { names, ids } = await siteRoomBin(page.request);
  const hdmiCable = uniqueName("HDMI cable");
  const photoItem = await addPhotoItem(page.request, ids.bin);
  await page.request.patch(`/api/items/${photoItem}`, { data: { name: hdmiCable } });
  await addItem(page.request, "USB-C charger", ids.bin);
  const [code = ""] = await makeLabels(page.request, 1);
  await claim(page.request, code, ids.bin);
  return { names, hdmiCable, code };
}

function searchField(page: Page): Locator {
  return page.getByRole("searchbox", { name: "Search" });
}

function resultRow(page: Page, text: string): Locator {
  return page.locator("#content li").filter({ hasText: text });
}

test("typing hdmi lists the HDMI cable with its path, photo and the match marked", async ({
  page,
}) => {
  const { names, hdmiCable, code } = await cablesBin(page);
  await openAtPhoneWidth(page, "/");
  await searchField(page).pressSequentially("hdmi");
  const row = resultRow(page, hdmiCable);
  await expect(row).toBeVisible();
  await expect(page).toHaveURL(/\/search\?q=hdmi$/);
  // A labelled bin's place in a path reads by its code.
  await expect(row).toContainText(`${names.site}${names.room}Bin ${code}`);
  await expect(row.locator("img")).toBeVisible();
  await expect(row.locator("mark")).toHaveText("HDMI");
});

test("a typo and reversed words still find it", async ({ page }) => {
  const { hdmiCable } = await cablesBin(page);
  const suffix = hdmiCable.split(" ").at(-1) ?? "";
  await openAtPhoneWidth(page, "/");
  await searchField(page).fill(`hdmi cabel ${suffix}`);
  await expect(resultRow(page, hdmiCable)).toBeVisible();
  await searchField(page).fill(`${suffix} cable hdmi`);
  await expect(resultRow(page, hdmiCable)).toBeVisible();
});

test("a label code typed in lower case without its hyphen finds the bin", async ({ page }) => {
  const { names, code } = await cablesBin(page);
  await openAtPhoneWidth(page, "/");
  await searchField(page).fill(code.toLowerCase().replace(/-0*/, ""));
  const first = page.locator("#content li").first();
  await expect(first).toContainText(names.bin);
  await expect(first).toContainText(code);
});

test("nothing found offers to add it, and the added item is then found", async ({ page }) => {
  const name = uniqueName("Multimeter");
  await openAtPhoneWidth(page, "/");
  await searchField(page).fill(name);
  await expect(page.getByText(`Nothing matches "${name}"`)).toBeVisible();
  await page.getByRole("button", { name: `Add "${name}"` }).click();
  const field = page.getByRole("dialog").getByRole("textbox", { name: "Add an item" });
  await expect(field).toHaveValue(name);
  await field.press("Enter");
  await page.keyboard.press("Escape");
  await expect(resultRow(page, name)).toBeVisible();
});

test("Back from search returns to where the search began", async ({ page }) => {
  const { names, ids } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await searchField(page).pressSequentially("cab");
  await expect(page).toHaveURL(/\/search\?q=cab$/);
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { level: 1, name: names.bin })).toBeVisible();
});
