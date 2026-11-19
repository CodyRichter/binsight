import { screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { ItemAdder } from "./ItemAdder";
import { useLocationItems } from "./useItems";

afterEach(() => {
  vi.unstubAllGlobals();
});

const cables = { id: "B2R-W9T", name: "Cables", path: [] };
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

function ItemLinks() {
  const { data = [] } = useLocationItems(cables.id, false);
  return (
    <>
      {data.map((item) => (
        <a key={item.id} href={`/items/${item.id}`}>
          {item.name}
        </a>
      ))}
    </>
  );
}

test("adding an item replaces its temporary id as soon as the POST succeeds", async () => {
  let listReads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = { ...hdmiCable, id: "real-drill", name: "Drill", history_entry_id: "h1" };
        return Promise.resolve(new Response(JSON.stringify(body), { status: 201 }));
      }
      if (path.startsWith("/api/items?")) {
        listReads += 1;
        // Hold the post-add refetch open so only the optimistic replacement can update the link.
        if (listReads > 1) return new Promise<Response>(() => undefined);
      }
      return Promise.resolve(
        new Response(JSON.stringify({ items: [hdmiCable], next_cursor: null }), { status: 200 }),
      );
    }),
  );
  const { user } = renderWithTheme(
    <>
      <ItemAdder home={cables} onSettled={vi.fn()} />
      <ItemLinks />
    </>,
  );
  expect(await screen.findByRole("link", { name: "HDMI cable" })).toBeVisible();
  await user.type(screen.getByRole("textbox", { name: "Add an item" }), "Drill{Enter}");
  await waitFor(() =>
    expect(screen.getByRole("link", { name: "Drill" })).toHaveAttribute(
      "href",
      "/items/real-drill",
    ),
  );
});
