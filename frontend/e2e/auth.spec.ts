import { expect, test, type APIRequestContext } from "@playwright/test";
import { addItem, siteRoomBin } from "./homeData";
import { openAtPhoneWidth, ownerPassword, ownerUsername, signedInState, signIn } from "./owner";

const accountPassword = "household horse";

/** Makes an account through the admin's session, a different username each run. */
async function addAccount(admin: APIRequestContext, role: "viewer" | "editor") {
  const username = `${role}-${Date.now()}`;
  const made = await admin.post("/api/auth/accounts", {
    data: { username, password: accountPassword, role },
  });
  expect(made.ok()).toBe(true);
  return username;
}

test("settings need an account: signing in returns there, and signing out gates it again", async ({
  page,
  context,
}) => {
  await openAtPhoneWidth(page, "/settings");
  await expect(page).toHaveURL("/login?next=%2Fsettings");

  await signIn(page, ownerUsername, "not the password");
  await expect(page.getByText("That username or password is wrong. Try again.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, ownerUsername, ownerPassword);
  await expect(page).toHaveURL("/settings");
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "binsight_session")?.httpOnly).toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login?next=%2Fsettings");
  await page.goto("/settings");
  await expect(page).toHaveURL("/login?next=%2Fsettings");
});

test("a scanned label opens its bin read-only to a visitor, who can sign in to change it", async ({
  page,
  playwright,
  baseURL,
}) => {
  const admin = await playwright.request.newContext({ baseURL, storageState: signedInState });
  const { names, ids } = await siteRoomBin(admin);
  const cable = await addItem(admin, "HDMI cable", ids.bin);
  await admin.patch(`/api/items/${cable}`, { data: { quantity: 3, price_cents: 1250 } });
  await admin.dispose();

  await openAtPhoneWidth(page, `/l/${ids.bin}`);
  await expect(page).toHaveURL(`/locations/${ids.bin}`);
  await expect(page.getByRole("heading", { level: 1, name: names.bin })).toBeVisible();
  await expect(page.getByRole("link", { name: "HDMI cable" })).toBeVisible();
  await expect(page.getByText("×3")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add an item" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Move HDMI cable" })).toHaveCount(0);

  await page.getByRole("link", { name: "HDMI cable" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "HDMI cable" })).toBeVisible();
  await expect(page.getByText("Price", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "History" })).toHaveCount(0);

  await page.getByRole("link", { name: "Sign in" }).click();
  await signIn(page, ownerUsername, ownerPassword);
  await expect(page).toHaveURL(`/items/${cable}`);
  await expect(page.getByRole("button", { name: "Name: HDMI cable" })).toBeVisible();
});

test("a View account sees the private details but nothing to change", async ({
  page,
  playwright,
  baseURL,
}) => {
  const admin = await playwright.request.newContext({ baseURL, storageState: signedInState });
  const { ids } = await siteRoomBin(admin);
  const cable = await addItem(admin, "HDMI cable", ids.bin);
  await admin.patch(`/api/items/${cable}`, { data: { serial_number: "SN-42" } });
  const viewer = await addAccount(admin, "viewer");
  await admin.dispose();

  await openAtPhoneWidth(page, "/login");
  await signIn(page, viewer, accountPassword);
  await expect(page).toHaveURL("/");
  await page.goto(`/items/${cable}`);
  await expect(page.getByText("SN-42")).toBeVisible();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Name: HDMI cable" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Move" })).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByText(`${viewer} · View`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accounts" })).toHaveCount(0);
});

test("an admin adds an Edit account, which can add to a bin and is named in its history", async ({
  page,
  browser,
  playwright,
  baseURL,
}) => {
  const api = await playwright.request.newContext({ baseURL, storageState: signedInState });
  const { ids } = await siteRoomBin(api);
  await api.dispose();
  const editor = `editor-${Date.now()}`;

  const adminContext = await browser.newContext({ storageState: signedInState });
  const admin = await adminContext.newPage();
  await openAtPhoneWidth(admin, "/settings");
  await admin.getByRole("button", { name: "Add account" }).click();
  const sheet = admin.getByRole("dialog", { name: "Add account" });
  await sheet.getByLabel("Username").fill(editor);
  await sheet.getByLabel("Password", { exact: true }).fill(accountPassword);
  await sheet.getByLabel("Repeat password").fill(accountPassword);
  await sheet.getByRole("button", { name: "Edit", exact: true }).click();
  await sheet.getByRole("button", { name: "Add", exact: true }).click();
  await expect(admin.getByRole("button", { name: `${editor}'s role: Edit` })).toBeVisible();

  await openAtPhoneWidth(page, `/locations/${ids.bin}`);
  await page.getByRole("link", { name: "Sign in" }).click();
  await signIn(page, editor, accountPassword);
  await expect(page).toHaveURL(`/locations/${ids.bin}`);
  await page.getByRole("textbox", { name: "Add an item" }).fill("Drill");
  const created = page.waitForResponse((answer) => answer.url().endsWith("/api/items"));
  await page.getByRole("textbox", { name: "Add an item" }).press("Enter");
  await created;
  await page.getByRole("link", { name: "Drill" }).click();
  await expect(page.getByText(/· You$/)).toBeVisible();
  const drill = page.url();

  await admin.goto(drill);
  await expect(admin.getByText(new RegExp(`· ${editor}$`))).toBeVisible();
  await adminContext.close();
});
