import { expect, test } from "@playwright/test";
import { openAtPhoneWidth } from "./owner";

interface Icon {
  src: string;
  purpose?: string;
}

interface Manifest {
  id: string;
  scope: string;
  start_url: string;
  display: string;
  icons: Icon[];
  shortcuts: { name: string; url: string; icons: Icon[] }[];
}

test("the manifest makes Binsight installable, with shortcuts to Scan, Add and Search", async ({
  page,
}) => {
  await openAtPhoneWidth(page, "/");
  const address = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = (await (await page.request.get(address ?? "")).json()) as Manifest;
  expect(manifest).toMatchObject({ id: "/", scope: "/", start_url: "/", display: "standalone" });
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  expect(manifest.shortcuts.map((shortcut) => [shortcut.name, shortcut.url])).toEqual([
    ["Scan", "/scan"],
    ["Add", "/?add"],
    ["Search", "/search"],
  ]);
  const icons = [...manifest.icons, ...manifest.shortcuts.flatMap((shortcut) => shortcut.icons)];
  for (const icon of icons) {
    const answer = await page.request.get(icon.src);
    expect(answer.status(), icon.src).toBe(200);
    expect(answer.headers()["content-type"], icon.src).toMatch(/^image\//);
  }
});

test("the Add shortcut opens Add, and closing it leaves an address that won't reopen it", async ({
  page,
}) => {
  await openAtPhoneWidth(page, "/?add");
  const sheet = page.getByRole("dialog", { name: "Add" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Locations" })).toBeVisible();
  await expect(sheet).toBeHidden();
});
