import type { Locator, Page } from "@playwright/test";

/** Where a locator is on screen, in CSS pixels. */
export async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error("Not on screen");
  return {
    left: found.x,
    top: found.y,
    right: found.x + found.width,
    bottom: found.y + found.height,
    height: found.height,
  };
}

/** Opens an address at phone width once its fonts have loaded, so measurements are final. */
export async function open(page: Page, path: string) {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}
