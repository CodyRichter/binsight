import { expect, test, type Page } from "@playwright/test";
import { addItem, addLocation, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

/** Flow 4's home: Shelf 2 holds Cables (with two items and a box) and Tools. */
async function shelfOfBins(page: Page) {
  const { names, ids } = await siteRoomBin(page.request);
  const shelf = await addLocation(page.request, uniqueName("Shelf 2"), "shelf", ids.room);
  const cablesName = uniqueName("Cables");
  const toolsName = uniqueName("Tools");
  const cables = await addLocation(page.request, cablesName, "bin", shelf);
  const tools = await addLocation(page.request, toolsName, "bin", shelf);
  const boxName = uniqueName("Small box");
  const box = await addLocation(page.request, boxName, "box", cables);
  await addItem(page.request, "HDMI cable", cables);
  const charger = uniqueName("USB-C charger");
  await addItem(page.request, charger, cables);
  return {
    names,
    ids: { ...ids, shelf, cables, tools },
    cablesName,
    toolsName,
    boxName,
    charger,
    toolsCode: tools,
    boxCode: box,
  };
}

/** Points the page's camera at a label: the camera shows the label's printable image. */
async function cameraSees(page: Page, code: string) {
  await page.addInitScript((imageAddress: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 480;
    const image = new Image();
    image.src = imageAddress;
    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (image.complete) context.drawImage(image, 40, 40, 400, 400 * (image.height / image.width));
    };
    window.setInterval(draw, 100);
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: () => Promise.resolve(canvas.captureStream(10)) },
    });
  }, `/api/labels/${code}/image`);
}

test("moving an item takes it out of the bin, and Undo puts it back", async ({ page }) => {
  const { ids, charger, toolsName } = await shelfOfBins(page);
  await openAtPhoneWidth(page, `/locations/${ids.cables}`);
  await page.getByRole("button", { name: `Move ${charger}` }).click();
  const sheet = page.getByRole("dialog", { name: "Move to" });
  await sheet.getByRole("textbox", { name: "Search locations" }).fill(toolsName);
  await sheet.getByRole("button", { name: new RegExp(`^${toolsName}`) }).click();
  await expect(page.getByRole("link", { name: charger })).toHaveCount(0);
  await expect(page.getByText(`Moved to ${toolsName}`)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: charger })).toBeVisible();
  await page.getByRole("button", { name: `Move ${charger}` }).click();
  await sheet.getByRole("textbox", { name: "Search locations" }).fill(toolsName);
  await sheet.getByRole("button", { name: new RegExp(`^${toolsName}`) }).click();
  await expect(page.getByRole("link", { name: charger })).toHaveCount(0);
  await page.goto(`/locations/${ids.tools}`);
  await page.getByRole("link", { name: charger }).click();
  await expect(page.getByRole("navigation", { name: "Path" })).toContainText(toolsName);
  const history = page.locator("#content section").filter({ hasText: "History" }).locator("li");
  await expect(history.first()).toContainText("Moved");
});

test("moving a bin by scanning the destination's label takes everything in it along", async ({
  page,
}) => {
  const { names, ids, toolsCode, toolsName } = await shelfOfBins(page);
  await cameraSees(page, toolsCode);
  await openAtPhoneWidth(page, `/locations/${ids.cables}`);
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await page.getByRole("button", { name: "Scan destination" }).click();
  await expect(page.getByText(`Moved to ${toolsName}`)).toBeVisible();
  const path = page.getByRole("navigation", { name: "Path" });
  await expect(path).toContainText(toolsName);
  await page.getByText(/^Everything inside/).click();
  const cable = page.locator("#content li").filter({ hasText: "HDMI cable" });
  await expect(cable).toContainText(toolsName);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(path).not.toContainText(toolsName);
  await expect(path).toContainText(names.room);
});

test("scanning a label inside the bin being moved says it can't go there", async ({ page }) => {
  const { ids, boxCode, boxName, cablesName } = await shelfOfBins(page);
  await cameraSees(page, boxCode);
  await openAtPhoneWidth(page, `/locations/${ids.cables}`);
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await page.getByRole("button", { name: "Scan destination" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Can't move into" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: cablesName })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Path" })).not.toContainText(boxName);
});

test("/scan opens a scanned label's page", async ({ page }) => {
  const { toolsCode, toolsName, ids } = await shelfOfBins(page);
  await cameraSees(page, toolsCode);
  await openAtPhoneWidth(page, `/locations/${ids.cables}`);
  await page.getByRole("button", { name: "Scan" }).click();
  await expect(page.getByRole("heading", { level: 1, name: toolsName })).toBeVisible();
});

test("/scan opens the page of a code typed loosely", async ({ page }) => {
  const { cablesName, ids } = await shelfOfBins(page);
  const code = ids.cables;
  await openAtPhoneWidth(page, "/scan");
  await page.getByRole("button", { name: "Type the code" }).click();
  await page.getByRole("textbox", { name: "Code" }).fill(code.toLowerCase().replace("-", ""));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: cablesName })).toBeVisible();
});
