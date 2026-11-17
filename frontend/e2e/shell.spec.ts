import { expect, test } from "@playwright/test";
import { openAtPhoneWidth as open } from "./owner";

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
