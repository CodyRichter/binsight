import { expect, test, type Locator } from "@playwright/test";
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

test("a bin's photo is added from its picture, shows in its header, and can be removed", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  const picture = page.getByRole("button", { name: "Change photo and icon" });
  const sheet = page.getByRole("dialog", { name: "Photo and icon" });
  await picture.click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    sheet.getByRole("button", { name: "Add photo" }).click(),
  ]);
  await chooser.setFiles({ name: "bin.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("status")).toContainText("Added a photo to");
  await expect(picture.locator('img[src^="/api/attachments/"]')).toBeVisible();
  await picture.click();
  await sheet.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Removed the photo" })).toBeVisible();
  await expect(picture.locator("img")).toHaveCount(0);
});

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected a visible bounding box");
  return box;
}

test("tapping an item's placeholder thumbnail adds its photo beside the quantity stepper", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const itemId = await addItem(page.request, uniqueName("Bike"), ids.bin);
  await openAtPhoneWidth(page, `/items/${itemId}`);
  const header = page.getByRole("main").locator("header");
  const addPhoto = header.getByRole("button", { name: "Add photo" });
  const stepper = header.getByRole("button", { name: "One more" });
  const move = header.getByRole("button", { name: "Move" });
  const [thumbBox, stepperBox, moveBox] = await Promise.all([
    boxOf(addPhoto),
    boxOf(stepper),
    boxOf(move),
  ]);
  expect(stepperBox.x).toBeGreaterThan(thumbBox.x + thumbBox.width);
  expect(stepperBox.y).toBeLessThan(moveBox.y);

  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), addPhoto.click()]);
  await chooser.setFiles({ name: "bike.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("status")).toContainText("Added a photo to");
  await expect(header.locator('img[src^="/api/attachments/"]')).toBeVisible();
  await expect(addPhoto).toHaveCount(0);
});
