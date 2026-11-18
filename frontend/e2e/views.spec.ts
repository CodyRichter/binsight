import { expect, test } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

test("a lent item is in Lent out with who has it, and a sold one in the Archive", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const lent = uniqueName("Ladder");
  const sold = uniqueName("Bike");
  const person = uniqueName("Sam");
  const lentId = await addItem(page.request, lent, ids.bin);
  const soldId = await addItem(page.request, sold, ids.bin);
  await page.request.post(`/api/items/${lentId}/lend`, { data: { lent_to: person } });
  await page.request.post(`/api/items/${soldId}/status`, { data: { status: "sold" } });
  await openAtPhoneWidth(page, "/views");
  await page.getByRole("link", { name: "Lent out", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lent out" })).toBeVisible();
  const row = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: lent }) });
  await expect(row).toContainText(`Lent to ${person}`);
  await page.goto("/views/archive");
  await expect(page.getByRole("link", { name: sold })).toBeVisible();
  await expect(page.getByRole("link", { name: lent })).toHaveCount(0);
});

test("a category search is saved, pinned into the navigation, deleted and undone", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const category = uniqueName("Cables");
  const saved = uniqueName("All cables");
  const cableId = await addItem(page.request, uniqueName("HDMI cable"), ids.bin);
  await page.request.patch(`/api/items/${cableId}`, { data: { category } });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/search?q=");
  // The chip's checkbox is drawn by its label, which takes the tap.
  await page
    .locator("label")
    .filter({ hasText: /^Category$/ })
    .click();
  await page
    .getByRole("dialog", { name: "Filter by category" })
    .getByRole("button", { name: category })
    .click();
  await expect(page.getByText("1 result")).toBeVisible();
  await page.getByRole("button", { name: "Save search" }).click();
  const sheet = page.getByRole("dialog", { name: "Save search" });
  await sheet.getByRole("textbox", { name: "Name" }).fill(saved);
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(`Saved ${saved}`);
  await page.goto("/views");
  await page.getByRole("main").getByRole("link", { name: saved }).click();
  await page.getByRole("button", { name: "Pin", exact: true }).click();
  const navigation = page.getByRole("navigation", { name: "Main" });
  await expect(navigation.getByRole("link", { name: saved })).toContainText("1");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete saved search" }).click();
  await expect(page).toHaveURL(/\/views$/);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("main").getByRole("link", { name: saved })).toBeVisible();
});
