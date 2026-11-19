import { expect, test, type Page } from "@playwright/test";
import { siteRoomBin } from "./homeData";
import { openAtPhoneWidth } from "./owner";

function sheet(page: Page) {
  return page.getByRole("dialog", { name: "Type and icon" });
}

test("changing a bin's type and icon from its thumbnail, and Undo", async ({ page }) => {
  const { ids, names } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  const thumbnail = page.getByRole("button", { name: "Change type and icon" });
  await thumbnail.click();
  await sheet(page).getByRole("button", { name: "Drawer", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Changed to drawer" })).toBeVisible();
  await expect(page.getByText("This drawer is empty")).toBeVisible();
  await thumbnail.click();
  await sheet(page).getByRole("textbox", { name: "Search icons" }).fill("refrigerator");
  await sheet(page).getByRole("button", { name: "Fridge", exact: true }).click();
  const toast = page.getByRole("status").filter({ hasText: "Icon changed" });
  await expect(toast).toBeVisible();
  await expect(thumbnail.locator("svg.tabler-icon-fridge")).toBeVisible();
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(thumbnail.locator("svg.tabler-icon-archive")).toBeVisible();
  await thumbnail.click();
  await sheet(page).getByRole("button", { name: "Bike", exact: true }).click();
  await expect(thumbnail.locator("svg.tabler-icon-bike")).toBeVisible();
  await expect
    .poll(async () => (await page.request.get(`/api/locations/${ids.bin}`)).json())
    .toMatchObject({ icon: "bike" });
  await page.goto(`/locations/${ids.room}`);
  const row = page.getByRole("listitem").filter({ hasText: names.bin });
  await expect(row.locator("svg.tabler-icon-bike")).toBeVisible();
});

test("a site's sheet offers icons but no type", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, `/locations/${ids.site}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Type and icon…" }).click();
  await expect(sheet(page).getByRole("button", { name: "Type's icon" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(sheet(page).getByRole("heading", { name: "Type", exact: true })).toHaveCount(0);
  await expect(sheet(page).getByRole("button", { name: "Room", exact: true })).toHaveCount(0);
});
