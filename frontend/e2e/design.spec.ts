import { expect, test } from "@playwright/test";

const widths = [390, 820, 1280];
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

for (const { name, path } of pages) {
  for (const width of widths) {
    test(`${path} renders at ${width}px`, async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (error) => errors.push(error));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(
        ["task", "gate"].includes(name) ? 0 : 1,
      );
      expect(errors).toEqual([]);
    });
  }
}
