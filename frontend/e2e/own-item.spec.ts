import { expect, test } from "@playwright/test";
import { addLocation, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

test("a desk tracked as an item shows its price on its page and in its room's insurance list", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const desk = uniqueName("Desk");
  const deskId = await addLocation(page.request, desk, "furniture", ids.room);
  await openAtPhoneWidth(page, `/locations/${deskId}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Track as an item" }).click();
  await expect(page.getByRole("status")).toContainText("Tracked as an item");
  await page.getByRole("button", { name: "Price: Add" }).click();
  const price = page.getByRole("textbox", { name: "Price" });
  await price.fill("1500");
  await price.press("Enter");
  await expect(page.getByRole("button", { name: "Price: 1500.00" })).toBeVisible();
  await page.goto(`/locations/${deskId}`);
  const card = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "As an item" }) });
  await expect(card).toContainText("1500.00");
  await expect(page.getByText("This furniture is empty")).toBeVisible();
  await card.getByRole("link", { name: "Open item" }).click();
  await expect(page).toHaveURL(/\/items\//);
  await page.goto(`/locations/${ids.room}/insurance`);
  await expect(page.getByText(desk).first()).toBeVisible();
});
