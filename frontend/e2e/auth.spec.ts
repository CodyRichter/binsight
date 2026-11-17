import { expect, test, type Page } from "@playwright/test";
import { openAtPhoneWidth, ownerPassword } from "./owner";

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
