import { expect, test, type Page } from "@playwright/test";
import { addItem, addLocation, claim, makeLabels, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

/** A shelf holding a bin with an item in it and an empty bin beside it. */
async function shelfOfTwoBins(page: Page) {
  const { ids } = await siteRoomBin(page.request);
  const shelf = await addLocation(page.request, uniqueName("Shelf"), "shelf", ids.room);
  const fullName = uniqueName("Cables");
  const otherName = uniqueName("Tools");
  const full = await addLocation(page.request, fullName, "bin", shelf);
  const other = await addLocation(page.request, otherName, "bin", shelf);
  const item = uniqueName("HDMI cable");
  await addItem(page.request, item, full);
  return { shelf, full, fullName, other, otherName, item };
}

async function pickInSheet(page: Page, title: string, name: string) {
  const sheet = page.getByRole("dialog", { name: title });
  await sheet.getByRole("textbox", { name: "Search locations" }).fill(name);
  await sheet.getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

async function more(page: Page, choice: string) {
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: choice }).click();
}

test("renaming a location and giving it a summary, in place", async ({ page }) => {
  const { full, fullName } = await shelfOfTwoBins(page);
  await openAtPhoneWidth(page, `/locations/${full}`);
  const renamed = uniqueName("Wires");
  await page.getByRole("button", { name: `Name: ${fullName}` }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(renamed);
  await page.getByRole("textbox", { name: "Name" }).press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await expect(page.getByRole("status").filter({ hasText: `Renamed to ${renamed}` })).toBeVisible();
  await page.getByRole("button", { name: /^Summary/ }).click();
  await page.getByRole("textbox", { name: "Summary" }).fill("spare network cables");
  await page.getByRole("textbox", { name: "Summary" }).press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Summary changed" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("spare network cables")).toBeVisible();
});

test("deleting a bin moves its contents first, and its page then offers Restore", async ({
  page,
}) => {
  const { shelf, full, fullName, otherName, item } = await shelfOfTwoBins(page);
  await openAtPhoneWidth(page, `/locations/${full}`);
  await more(page, "Delete location");
  await pickInSheet(page, "Move contents to", otherName);
  await expect(page).toHaveURL(`/locations/${shelf}`);
  await expect(page.getByRole("status").filter({ hasText: `Deleted ${fullName}` })).toBeVisible();
  await expect(page.getByRole("link", { name: fullName })).toHaveCount(0);
  await page.getByRole("link", { name: otherName }).click();
  await expect(page.getByRole("link", { name: item })).toBeVisible();
  await page.goto(`/locations/${full}`);
  await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
});

test("an empty bin is deleted at once and Undo puts it back", async ({ page }) => {
  const { shelf, other, otherName } = await shelfOfTwoBins(page);
  await openAtPhoneWidth(page, `/locations/${other}`);
  await more(page, "Delete location");
  await expect(page).toHaveURL(`/locations/${shelf}`);
  await expect(page.getByRole("link", { name: otherName })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: otherName })).toBeVisible();
});

test("merging a bin into another takes its items and its label", async ({ page }) => {
  const { full, fullName, other, otherName, item } = await shelfOfTwoBins(page);
  const [code = ""] = await makeLabels(page.request, 1);
  await claim(page.request, code, full);
  await openAtPhoneWidth(page, `/locations/${full}`);
  await more(page, "Merge into…");
  await pickInSheet(page, "Merge into", otherName);
  await expect(page).toHaveURL(`/locations/${other}`);
  await expect(
    page.getByRole("status").filter({ hasText: `Merged ${fullName} into ${otherName}` }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: item })).toBeVisible();
  await expect(page.getByText(code, { exact: true }).first()).toBeVisible();
});

test("a deleted bin's label says so and restores it", async ({ page }) => {
  const { other, otherName } = await shelfOfTwoBins(page);
  const [code = ""] = await makeLabels(page.request, 1);
  await claim(page.request, code, other);
  await page.request.delete(`/api/locations/${other}`);
  await openAtPhoneWidth(page, `/l/${code}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(otherName);
  await expect(page.getByText(/^Deleted/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Contents checked" })).toHaveCount(0);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("status").filter({ hasText: `Restored ${otherName}` })).toBeVisible();
  await expect(page.getByRole("button", { name: "Contents checked" })).toBeVisible();
});

test("dragging a bin above another keeps the new order", async ({ page }) => {
  const { shelf, fullName, otherName } = await shelfOfTwoBins(page);
  await openAtPhoneWidth(page, `/locations/${shelf}`);
  const names = page.getByRole("list").getByRole("link", { name: /Cables|Tools/ });
  await expect(names).toHaveText([fullName, otherName]);
  const handle = page.getByRole("button", { name: `Reorder ${otherName}` });
  await handle.focus();
  const spoken = (words: string) => page.getByRole("status").filter({ hasText: words });
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  // dnd-kit measures the rows just after pickup and ignores a key pressed before then.
  await expect(async () => {
    await page.keyboard.press("ArrowUp");
    await expect(spoken(`${otherName} is now at place 1`)).toBeAttached({ timeout: 500 });
  }).toPass();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status").filter({ hasText: `Moved ${otherName}` })).toBeVisible();
  await expect(names).toHaveText([otherName, fullName]);
  await page.reload();
  await expect(names).toHaveText([otherName, fullName]);
});
