import { expect, test, type Page } from "@playwright/test";

const widths = [390, 820, 1280];
const colorSchemes = ["light", "dark"] as const;
const pages = [
  { name: "design", path: "/design" },
  { name: "browse", path: "/design/browse/cables" },
  { name: "browse-top", path: "/design/browse" },
  { name: "list", path: "/design/list?q=cable" },
  { name: "record", path: "/design/record/hdmi-cable" },
  { name: "task", path: "/design/task" },
  { name: "settings", path: "/design/settings" },
  { name: "gate", path: "/design/gate" },
];

async function capture(page: Page, width: number, name: string) {
  await page.evaluate(() => document.fonts.ready);
  // A full-page capture would draw fixed bars where the first screen ends.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height });
  await expect(page).toHaveScreenshot(`${name}.png`, { animations: "disabled" });
}

for (const { name, path } of pages) {
  for (const width of widths) {
    for (const colorScheme of colorSchemes) {
      test(`${path} at ${width}px in ${colorScheme}`, async ({ page }) => {
        const errors: Error[] = [];
        page.on("pageerror", (error) => errors.push(error));
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(
          ["task", "gate"].includes(name) ? 0 : 1,
        );
        await capture(page, width, `${name}-${width}-${colorScheme}`);
        expect(errors).toEqual([]);
      });
    }
  }
}
