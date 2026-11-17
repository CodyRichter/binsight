import { expect, test, type Page } from "@playwright/test";

async function open(page: Page, path: string) {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(path);
}

test("an unknown address renders inside the frame", async ({ page }) => {
  await open(page, "/anything");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByText("Can't reach Binsight")).toHaveCount(0);
});

test("an unreachable backend says so, and Try again recovers", async ({ page }) => {
  await page.route("/api/**", (route) => route.abort());
  await open(page, "/anything");
  await expect(page.getByText("Can't reach Binsight")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  await page.unroute("/api/**");
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
});
