import { expect, test } from "@playwright/test";
import { addItem, callTool, mcpSecret, siteRoomBin, uniqueName } from "./homeData";
import { openAtPhoneWidth } from "./owner";

test("changes Claude makes through MCP show in the app, and deleting waits for confirmation", async ({
  page,
}) => {
  const { ids } = await siteRoomBin(page.request);
  const code = ids.bin;
  const charger = uniqueName("USB-C charger");
  const chargerId = await addItem(page.request, charger, ids.bin);
  const secret = await mcpSecret(page.request);

  const ethernet = uniqueName("Ethernet cable");
  await callTool(page.request, secret, "create_item", { name: ethernet, home_location_id: code });
  await openAtPhoneWidth(page, `/l/${code}`);
  await expect(page.getByRole("link", { name: ethernet })).toBeVisible();

  const asked = await callTool(page.request, secret, "delete_item", { item_id: chargerId });
  const preview = asked.preview as { confirmation_token: string };
  await page.reload();
  await expect(page.getByRole("link", { name: charger })).toBeVisible();

  await callTool(page.request, secret, "delete_item", {
    item_id: chargerId,
    confirmation_token: preview.confirmation_token,
  });
  await page.reload();
  await expect(page.getByRole("link", { name: charger })).toHaveCount(0);

  await page.goto(`/items/${chargerId}`);
  const history = page.locator("#content section").filter({ hasText: "History" }).locator("li");
  await expect(history.first()).toContainText("Deleted");
  await expect(history.first()).toContainText("Claude");
});
