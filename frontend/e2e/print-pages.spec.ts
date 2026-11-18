import { expect, test, type APIRequestContext } from "@playwright/test";
import { uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

async function imported(request: APIRequestContext, site: string, csv: string): Promise<string> {
  const response = await request.post("/api/import", {
    multipart: { csv: { name: "items.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } },
  });
  expect(response.ok()).toBe(true);
  const tree = (await (await request.get("/api/locations")).json()) as {
    locations: { id: string; name: string }[];
  };
  const found = tree.locations.find((location) => location.name === site);
  if (!found) throw new Error(`The import made no site named ${site}`);
  return found.id;
}

test("the insurance list opens from settings with each item's details and the total", async ({
  page,
}) => {
  const site = uniqueName("Loft");
  const csv = `name,quantity,price,location,serial_number\nCamera,2,450.00,${site} > Bin 1,SN-77\n`;
  await imported(page.request, site, csv);
  await openAtPhoneWidth(page, "/settings");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Insurance list" })
    .getByRole("link", { name: "Open" })
    .click();
  await expect(page).toHaveURL(/\/insurance$/);
  const camera = page.getByRole("listitem").filter({ hasText: "Camera" });
  await expect(camera).toContainText("SN-77");
  await expect(camera).toContainText("450.00");
  await expect(camera).toContainText(`${site} > Bin 1`);
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("a location's contents sheet lists its items grouped by the bin they are in", async ({
  page,
}) => {
  const site = uniqueName("Cellar");
  const csv = `name,quantity,location\nJam,6,${site} > Shelf A\nCider,2,${site}\n`;
  const siteId = await imported(page.request, site, csv);
  await openAtPhoneWidth(page, `/locations/${siteId}`);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Contents sheet" }).click();
  await expect(page).toHaveURL(new RegExp(`/locations/${siteId}/sheet$`));
  await expect(page.getByRole("heading", { level: 1, name: site })).toBeVisible();
  const shelf = page.locator("section").filter({ hasText: "Shelf A" });
  await expect(shelf).toContainText("6 ×");
  await expect(shelf).toContainText("Jam");
  await expect(page.locator("section").first()).toContainText("Cider");
});
