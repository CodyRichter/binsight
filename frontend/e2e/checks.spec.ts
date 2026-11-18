import { expect, test } from "@playwright/test";
import { addItem, addLocation, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

test("Contents checked stamps the bin as checked today, and Undo puts it back", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  await addItem(page.request, uniqueName("HDMI cable"), ids.bin);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await expect(page.getByText("Never checked")).toBeVisible();
  await page.getByRole("button", { name: "Contents checked" }).click();
  await expect(page.getByText("Checked today")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Contents checked");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Never checked")).toBeVisible();
});

test("check mode marks what wasn't ticked missing, keeps what was added, and one Undo reverses it", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const cable = uniqueName("HDMI cable");
  const charger = uniqueName("USB-C charger");
  const extra = uniqueName("Ethernet cable");
  await addItem(page.request, cable, ids.bin);
  const chargerId = await addItem(page.request, charger, ids.bin);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Check mode" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Check / })).toBeVisible();
  // The whole row is the checkbox's target, so the name is what gets tapped.
  await page.getByText(cable, { exact: true }).click();
  await expect(page.getByRole("checkbox", { name: cable })).toBeChecked();
  const field = page.getByRole("textbox", { name: "Add an item" });
  await field.fill(extra);
  await field.press("Enter");
  await expect(page.getByRole("checkbox", { name: extra })).toBeChecked();
  await page.getByRole("button", { name: "Contents checked" }).click();
  const dialog = page.getByRole("dialog", { name: "Mark 1 unchecked item missing?" });
  await dialog.getByRole("button", { name: "Mark missing" }).click();
  await expect(page.getByText("Marked 1 item missing")).toBeVisible();
  await expect(page.getByText("Checked today")).toBeVisible();
  await expect(page.getByRole("link", { name: extra })).toBeVisible();
  const checkedToast = page.getByRole("status").filter({ hasText: "Marked 1 item missing" });
  await checkedToast.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Never checked")).toBeVisible();
  await page.goto(`/items/${chargerId}`);
  await expect(page.getByRole("button", { name: "Mark missing" })).toBeVisible();
});

test("an item marked missing is found again in another bin", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const otherName = uniqueName("Tools");
  await addLocation(page.request, otherName, "bin", ids.room);
  const name = uniqueName("Multimeter");
  const itemId = await addItem(page.request, name, ids.bin);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await page.getByRole("button", { name: "Mark missing" }).click();
  await expect(page.getByText(`Marked ${name} missing`)).toBeVisible();
  await expect(page.locator("#content header").getByText("Missing")).toBeVisible();
  await page.getByRole("button", { name: "Mark found" }).click();
  const sheet = page.getByRole("dialog", { name: "Where is it now?" });
  await expect(sheet.getByRole("button", { name: /^Where it was/ })).toBeVisible();
  await sheet.getByRole("textbox", { name: "Search locations" }).fill(otherName);
  await sheet.getByRole("button", { name: new RegExp(`^${otherName}`) }).click();
  await expect(page.getByText(`Found ${name} in ${otherName}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark missing" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Path" })).toContainText(otherName);
});
