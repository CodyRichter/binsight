import { expect, test } from "@playwright/test";

const widths = [390, 1280];
const colorSchemes = ["light", "dark"] as const;

for (const width of widths) {
  for (const colorScheme of colorSchemes) {
    test(`/design at ${width}px in ${colorScheme}`, async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (error) => errors.push(error));
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto("/design");
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      // A full-page capture would draw the fixed bottom bar where the first screen ends.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width, height });
      await expect(page).toHaveScreenshot(`design-${width}-${colorScheme}.png`, {
        animations: "disabled",
      });
      expect(errors).toEqual([]);
    });
  }
}
