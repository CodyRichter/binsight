import { expect, test } from "@playwright/test";
import { addItem, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
);
// The smallest valid PNG: one transparent pixel.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("a receipt is attached to an item and opens as a PDF", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const name = uniqueName("Drill");
  const itemId = await addItem(page.request, name, ids.bin);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Attach…" }).click();
  await page.getByLabel("File").setInputFiles({
    name: "Receipt.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await expect(page.getByRole("status")).toContainText("Attached Receipt.pdf");
  const link = page.getByRole("link", { name: "Receipt.pdf" });
  const served = await page.request.get((await link.getAttribute("href")) ?? "");
  expect(served.headers()["content-type"]).toBe("application/pdf");
});

test("a web link is attached, removed and put back with Undo", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  const itemId = await addItem(page.request, uniqueName("Router"), ids.bin);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Attach…" }).click();
  await page
    .getByRole("dialog", { name: "Attach" })
    .getByRole("button", { name: "Add link" })
    .click();
  const sheet = page.getByRole("dialog", { name: "Add link" });
  await sheet.getByRole("textbox", { name: "Address" }).fill("https://example.com/manual");
  await sheet.getByRole("textbox", { name: "Name" }).fill("Manual");
  await sheet.getByRole("button", { name: "Attach" }).click();
  await expect(page.getByRole("link", { name: "Manual" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Manual" }).click();
  await expect(page.getByRole("link", { name: "Manual" })).toHaveCount(0);
  const removed = page.getByRole("status").filter({ hasText: "Removed Manual" });
  await removed.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: "Manual" })).toBeVisible();
});

test("a bin's photo shows in its header", async ({ page }) => {
  const { ids } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Add photo" }).click();
  await page.getByLabel("Location photo").setInputFiles({
    name: "bin.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByRole("status")).toContainText("Added a photo to");
  await expect(page.getByRole("main").locator('img[src^="/api/attachments/"]')).toBeVisible();
});
