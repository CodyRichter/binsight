import { afterEach, expect, test, vi } from "vitest";
import { ApiError, api, apiRequest } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("rejects trailing slashes on API paths", async () => {
  await expect(api.get("/api/items/")).rejects.toThrow("trailing slash");
});

test("sends JSON payloads with null preserved and returns parsed JSON", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ id: "1", lent_to: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await api.patch<{ id: string; lent_to: string | null }>("/api/items/1", {
    lent_to: null,
  });

  expect(result).toEqual({ id: "1", lent_to: null });
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("/api/items/1");
  expect(init.method).toBe("PATCH");
  expect(init.body).toBe('{"lent_to":null}');
  expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
});

test("maps backend JSON errors into ApiError", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          code: "location_has_contents",
          message: "Move or reassign this location's contents before deleting it.",
          details: { count: 4 },
        },
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  await expect(api.delete("/api/locations/1")).rejects.toMatchObject({
    status: 409,
    code: "location_has_contents",
    message: "Move or reassign this location's contents before deleting it.",
    details: { count: 4 },
  });
});

test("maps fetch rejection into network ApiError", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

  let caught: unknown;
  try {
    await apiRequest("/api/locations");
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ApiError);
  expect((caught as ApiError).isNetworkError).toBe(true);
  expect((caught as ApiError).message).toBe("Can't reach Binsight.");
});

test("a proxy that gets no answer from Binsight counts as unreachable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));

  await expect(api.get("/api/health")).rejects.toMatchObject({
    isNetworkError: true,
    message: "Can't reach Binsight.",
  });
});
