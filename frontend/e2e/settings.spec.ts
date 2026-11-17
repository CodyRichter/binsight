import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

function listTools(request: APIRequestContext, secret: string) {
  return request.post("/mcp", {
    data: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json, text/event-stream",
    },
  });
}

function credentialRow(page: Page, name: string) {
  return page.locator("#content li").filter({ hasText: name });
}

async function addCredential(page: Page, name: string): Promise<string> {
  await page.getByRole("button", { name: "Add MCP credential" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Name").fill(name);
  await sheet.getByRole("button", { name: "Add" }).click();
  const command = await sheet.getByLabel("Command").inputValue();
  const secret = /Bearer ([^"]+)"/.exec(command)?.[1];
  expect(command).toContain("/mcp ");
  expect(secret).toBeTruthy();
  return secret ?? "";
}

test("an MCP credential lets Claude in until it is revoked", async ({ page }) => {
  const name = uniqueName("Claude Code");
  await openAtPhoneWidth(page, "/settings");
  const secret = await addCredential(page, name);
  expect((await listTools(page.request, secret)).status()).toBe(200);

  await page.getByRole("button", { name: "Done" }).click();
  await expect(credentialRow(page, name)).toBeVisible();
  await page.reload();
  await expect(credentialRow(page, name)).toBeVisible();
  await expect(page.getByText(secret)).toHaveCount(0);

  await credentialRow(page, name).getByRole("button", { name: "Revoke" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Revoke" }).click();
  await expect(credentialRow(page, name)).toHaveCount(0);
  expect((await listTools(page.request, secret)).status()).toBe(401);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
});

test("an MCP credential with no name keeps the sheet open with the field's error", async ({
  page,
}) => {
  await openAtPhoneWidth(page, "/settings");
  await page.getByRole("button", { name: "Add MCP credential" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Add" }).click();
  await expect(sheet.getByLabel("Name")).toHaveAccessibleDescription(/\S/);
  await expect(sheet.getByLabel("Name")).toBeVisible();
});
