import { expect, test } from "@playwright/test";

const widths = [390, 820, 1280];

for (const width of widths) {
  test(`/design renders at ${width}px`, async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
