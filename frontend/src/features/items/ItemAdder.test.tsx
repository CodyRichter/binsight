import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { ItemAdder } from "./ItemAdder";

afterEach(() => {
  vi.unstubAllGlobals();
});

const cables = { id: "cables", name: "Cables", label_code: "B-014", path: [] };
const hdmiCable = {
  id: "hdmi",
  name: "HDMI cable",
  quantity: 3,
  home_location_id: "cables",
  path: [],
  photo_url: null,
  created_at: "2026-11-16T12:00:00Z",
};

function stubBackend() {
  const fetchMock = vi.fn((_path: string, init?: RequestInit) => {
    const body =
      init?.method === "PATCH"
        ? { ...hdmiCable, quantity: 4, history_entry_id: "e2" }
        : { items: [hdmiCable], next_cursor: null };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

test("a name already here offers Add to existing, which raises its quantity", async () => {
  const fetchMock = stubBackend();
  const { user } = renderWithTheme(<ItemAdder home={cables} onSettled={vi.fn()} />);
  await user.type(screen.getByRole("textbox", { name: "Add an item" }), "hdmi CABLE");
  expect(await screen.findByText("HDMI cable is already here")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add to existing" }));
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/items/hdmi",
    expect.objectContaining({ method: "PATCH", body: '{"quantity":4}' }),
  );
  expect(await screen.findByText("Added 1 more HDMI cable")).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Add an item" })).toHaveValue("");
});

test("a new name offers nothing", async () => {
  stubBackend();
  const { user } = renderWithTheme(<ItemAdder home={cables} onSettled={vi.fn()} />);
  await user.type(screen.getByRole("textbox", { name: "Add an item" }), "Ethernet cable");
  expect(screen.queryByRole("button", { name: "Add to existing" })).toBeNull();
});
