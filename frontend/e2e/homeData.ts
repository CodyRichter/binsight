import { readFileSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";

/** A name no other test in the run uses, since every test shares one backend. */
export function uniqueName(word: string): string {
  return `${word} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Adds a location through the API, for a test about something other than adding it. */
export async function addLocation(
  request: APIRequestContext,
  name: string,
  type: string,
  parentId: string | null = null,
): Promise<string> {
  const response = await request.post("/api/locations", {
    data: { name, type, parent_id: parentId },
  });
  return ((await response.json()) as { id: string }).id;
}

/** Adds an item through the API to a location. */
export async function addItem(request: APIRequestContext, name: string, homeId: string) {
  const response = await request.post("/api/items", {
    data: { name, home_location_id: homeId },
  });
  return ((await response.json()) as { id: string }).id;
}

/** A site holding a room holding a bin, each uniquely named. */
export async function siteRoomBin(request: APIRequestContext) {
  const names = { site: uniqueName("Home"), room: uniqueName("Garage"), bin: uniqueName("Cables") };
  const site = await addLocation(request, names.site, "site");
  const room = await addLocation(request, names.room, "room", site);
  const bin = await addLocation(request, names.bin, "bin", room);
  return { names, ids: { site, room, bin } };
}

/** Makes blank labels through the API, giving back their codes. */
export async function makeLabels(request: APIRequestContext, count: number): Promise<string[]> {
  const response = await request.post("/api/labels/blank", { data: { count } });
  const made = (await response.json()) as { labels: { code: string }[] };
  return made.labels.map((label) => label.code);
}

/** Claims a blank label for a location through the API. */
export async function claim(request: APIRequestContext, code: string, locationId: string) {
  await request.post(`/api/labels/${code}/claim`, { data: { location_id: locationId } });
}

/** The photo the tests add items by, as a phone camera would hand it over. */
export const photoFile = new URL("./fixtures/photo.jpg", import.meta.url).pathname;

/** Adds an item by photo through the API, with no name, to a location or the inbox. */
export async function addPhotoItem(request: APIRequestContext, homeId?: string): Promise<string> {
  const response = await request.post("/api/items/add-by-photo", {
    multipart: {
      photo: { name: "photo.jpg", mimeType: "image/jpeg", buffer: readFileSync(photoFile) },
      ...(homeId ? { home_location_id: homeId } : {}),
    },
  });
  return ((await response.json()) as { id: string }).id;
}

/** Makes an MCP credential through the API, giving back its secret. */
export async function mcpSecret(request: APIRequestContext): Promise<string> {
  const response = await request.post("/api/auth/mcp-credentials", {
    data: { name: uniqueName("Claude Code") },
  });
  return ((await response.json()) as { secret: string }).secret;
}

/** Calls one MCP tool as Claude does, giving back its structured result. */
export async function callTool(
  request: APIRequestContext,
  secret: string,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await request.post("/mcp", {
    data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
    headers: { Authorization: `Bearer ${secret}`, Accept: "application/json, text/event-stream" },
  });
  const body = (await response.json()) as {
    result: { isError: boolean; structuredContent: Record<string, unknown> };
  };
  if (body.result.isError) throw new Error(`${name} refused: ${JSON.stringify(body.result)}`);
  return body.result.structuredContent;
}
