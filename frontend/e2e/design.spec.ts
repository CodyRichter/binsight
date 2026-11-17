import { expect, test } from "@playwright/test";

const widths = [390, 820, 1280];
const pages = [
  { name: "design", path: "/design" },
  { name: "task", path: "/design/task" },
];

for (const { name, path } of pages) {
  for (const width of widths) {
    test(`${path} renders at ${width}px`, async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (error) => errors.push(error));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(
        name === "task" ? 0 : 1,
      );
      expect(errors).toEqual([]);
    });
  }
}
