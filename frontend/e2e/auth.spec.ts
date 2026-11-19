import { expect, test, type Page } from "@playwright/test";
import { siteRoomBin } from "./homeData";
import { openAtPhoneWidth, ownerPassword, signedInState } from "./owner";

async function signIn(page: Page, password: string) {
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("signing in returns to the page asked for, and signing out gates it again", async ({
  page,
  context,
}) => {
  await openAtPhoneWidth(page, "/settings");
  await expect(page).toHaveURL("/login?next=%2Fsettings");

  await signIn(page, "not the password");
  await expect(page.getByText("That password is wrong. Try again.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, ownerPassword);
  await expect(page).toHaveURL("/settings");
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "binsight_session")?.httpOnly).toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login?next=%2Fsettings");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.goto("/settings");
  await expect(page).toHaveURL("/login?next=%2Fsettings");
});

test("a signed-out owner who scans a label signs in and lands on its bin", async ({
  page,
  playwright,
  baseURL,
}) => {
  const owner = await playwright.request.newContext({ baseURL, storageState: signedInState });
  const { names, ids } = await siteRoomBin(owner);
  const code = ids.bin;
  await owner.dispose();

  await openAtPhoneWidth(page, `/l/${code}`);
  await expect(page).toHaveURL(`/login?next=%2Flocations%2F${code}`);
  await signIn(page, ownerPassword);
  await expect(page).toHaveURL(`/locations/${code}`);
  await expect(page.getByRole("heading", { level: 1, name: names.bin })).toBeVisible();
});
