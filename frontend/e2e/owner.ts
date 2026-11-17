import type { Page } from "@playwright/test";

export const ownerPassword = "correct horse battery";

/** Where the setup project keeps the signed-in owner's cookie for the other projects. */
export const signedInState = "playwright/.auth/owner.json";

/** Opens an address at phone width, the width every flow is checked at. */
export async function openAtPhoneWidth(page: Page, path: string) {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(path);
}
