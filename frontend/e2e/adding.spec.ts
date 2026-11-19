import { expect, test, type Locator, type Page } from "@playwright/test";
import { addItem, photoFile, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

/** Cables as in docs/acceptance.md: an HDMI cable, quantity 3, and a USB-C charger. */
async function cablesBin(page: Page) {
  const { names, ids } = await siteRoomBin(page.request);
  const hdmiCable = await addItem(page.request, "HDMI cable", ids.bin);
  await page.request.patch(`/api/items/${hdmiCable}`, { data: { quantity: 3 } });
  await addItem(page.request, "USB-C charger", ids.bin);
  return { names, ids, code: ids.bin };
}

function itemRows(page: Page): Locator {
  return page.locator("#content li");
}

async function paste(field: Locator, text: string) {
  await field.evaluate((input, pasted) => {
    const data = new DataTransfer();
    data.setData("text/plain", pasted);
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
  }, text);
}

test("an item added by name shows at once, the field is ready again, and Undo removes it", async ({
  page,
}) => {
  const { code, names } = await cablesBin(page);
  await openAtPhoneWidth(page, `/l/${code}`);
  const field = page.getByRole("textbox", { name: "Add an item" });
  await field.fill("Ethernet cable");
  await field.press("Enter");
  const row = itemRows(page).filter({ hasText: "Ethernet cable" });
  await expect(row).toBeVisible();
  await expect(field).toBeFocused();
  await expect(field).toHaveValue("");
  await expect(page.getByText(`Added Ethernet cable to ${names.bin}`)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(itemRows(page).filter({ hasText: "HDMI cable" })).toBeVisible();
  await expect(itemRows(page).filter({ hasText: "Ethernet cable" })).toHaveCount(0);
});

test("pasting three lines into the add field adds three items, and one Undo takes all three back", async ({
  page,
}) => {
  const { code, names } = await cablesBin(page);
  await openAtPhoneWidth(page, `/l/${code}`);
  await paste(
    page.getByRole("textbox", { name: "Add an item" }),
    "Patch cable\nCable ties\nVelcro",
  );
  await page.locator("#content").getByRole("button", { name: "Add", exact: true }).click();
  for (const name of ["Patch cable", "Cable ties", "Velcro"]) {
    await expect(itemRows(page).filter({ hasText: name })).toBeVisible();
  }
  await expect(page.getByText(`Added 3 items to ${names.bin}`)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(itemRows(page).filter({ hasText: "Velcro" })).toHaveCount(0);
  await expect(itemRows(page)).toHaveCount(2);
});

test("a photo adds an Unnamed item that waits in the inbox until it is named", async ({ page }) => {
  const { code, names } = await cablesBin(page);
  await openAtPhoneWidth(page, `/l/${code}`);
  // The add bar's camera input; the header's photo input for the bin is the other one.
  await page.locator('input[type="file"][aria-hidden="true"]').setInputFiles(photoFile);
  await expect(page.getByText(`Added a photo to ${names.bin}`)).toBeVisible();
  const unnamed = itemRows(page).filter({ hasText: "Unnamed" });
  await expect(unnamed.locator("img")).toBeVisible();

  await page.goto("/inbox");
  const waiting = itemRows(page).filter({ hasText: names.bin });
  await expect(waiting).toContainText("Unnamed");
  await waiting.getByRole("link", { name: "Unnamed" }).click();
  await expect(page).toHaveTitle("Unnamed – Binsight");
  const name = uniqueName("Multimeter");
  await page.getByRole("button", { name: "Name: Unnamed" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(name);
  await page.getByRole("textbox", { name: "Name" }).press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByRole("status").filter({ hasText: `Named ${name}` })).toBeVisible();

  await page.goto("/inbox");
  await expect(itemRows(page).filter({ hasText: name })).toHaveCount(0);
});

test("typing a name already in the bin offers Add to existing, which raises its quantity", async ({
  page,
}) => {
  const { code } = await cablesBin(page);
  await openAtPhoneWidth(page, `/l/${code}`);
  await page.getByRole("textbox", { name: "Add an item" }).fill("HDMI cable");
  await expect(page.getByText("HDMI cable is already here")).toBeVisible();
  await page.getByRole("button", { name: "Add to existing" }).click();
  await expect(page.getByText("Added 1 more HDMI cable")).toBeVisible();
  const hdmiRows = itemRows(page).filter({ hasText: "HDMI cable" });
  await expect(hdmiRows).toHaveCount(1);
  await expect(hdmiRows.getByRole("button", { name: /^Quantity 4/ })).toBeVisible();
});

test("Add in the bottom bar adds to the inbox, or to a location picked in Add to", async ({
  page,
}) => {
  const { names } = await siteRoomBin(page.request);
  await openAtPhoneWidth(page, "/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("button", { name: "Add" }).click();
  const sheet = page.getByRole("dialog");
  const inboxName = uniqueName("Tape measure");
  await sheet.getByRole("textbox", { name: "Add an item" }).fill(inboxName);
  await sheet.getByRole("textbox", { name: "Add an item" }).press("Enter");
  await expect(page.getByText(`Added ${inboxName} to Inbox`)).toBeVisible();
  await expect(nav.getByRole("link", { name: /^Inbox \d+$/ })).toBeVisible();

  await sheet.getByRole("button", { name: /^Add to Inbox/ }).click();
  await sheet.getByRole("button", { name: names.site, exact: true }).click();
  const binName = uniqueName("Level");
  await sheet.getByRole("textbox", { name: "Add an item" }).fill(binName);
  await sheet.getByRole("textbox", { name: "Add an item" }).press("Enter");
  await expect(page.getByText(`Added ${binName} to ${names.site}`)).toBeVisible();

  await page.goto("/inbox");
  await expect(itemRows(page).filter({ hasText: inboxName })).toBeVisible();
  await expect(itemRows(page).filter({ hasText: binName })).toHaveCount(0);
});
