import { expect, test, type APIRequestContext } from "@playwright/test";
import { uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

async function locationNames(request: APIRequestContext): Promise<string[]> {
  const tree = (await (await request.get("/api/locations")).json()) as {
    locations: { name: string }[];
  };
  return tree.locations.map((location) => location.name);
}

test("everything downloads as one zip from settings", async ({ page }) => {
  await openAtPhoneWidth(page, "/settings");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Export everything" })
    .getByRole("link", { name: "Download" })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^binsight-export-\d{4}-\d{2}-\d{2}\.zip$/);
  const zip = await page.request.get("/api/export");
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect((await zip.body()).includes("binsight.json")).toBe(true);
});

test("a CSV file is imported into new locations and taken back with Undo", async ({ page }) => {
  const site = uniqueName("Storage unit");
  const csv = `name,quantity,location\nTent,1,${site} > Bin 1\nTarp,2,${site} > Bin 1\n`;
  await openAtPhoneWidth(page, "/settings");
  await page.getByLabel("CSV file").setInputFiles({
    name: "items.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  const imported = page.getByRole("status").filter({ hasText: "Imported 2 items" });
  await expect(imported).toContainText("into 2 new locations");
  expect(await locationNames(page.request)).toContain(site);
  await imported.getByRole("button", { name: "Undo" }).click();
  await expect.poll(() => locationNames(page.request)).not.toContain(site);
});

test("a file with a bad row says which row and imports nothing", async ({ page }) => {
  await openAtPhoneWidth(page, "/settings");
  await page.getByLabel("CSV file").setInputFiles({
    name: "items.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,quantity\nTent,lots\n"),
  });
  const sheet = page.getByRole("dialog", { name: "Can't import" });
  await expect(sheet).toContainText("Row 2");
  await expect(sheet).toContainText("quantity:");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
});
