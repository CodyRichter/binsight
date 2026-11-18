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

/** Waits until nothing on the page is moving, so a sheet that just opened is measured where it rests. */
export async function settled(page: Page) {
  // A transition can be cancelled and replaced, so poll rather than await each one's end.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  );
}
