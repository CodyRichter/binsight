import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { MergeSheet } from "./MergeSheet";
import type { Item } from "./useItems";

afterEach(() => {
  vi.unstubAllGlobals();
});

function item(id: string, name: string): Item {
  return {
    id,
    name,
    quantity: 1,
    home_location_id: "cables",
    status: "in_place",
    category: null,
    tags: [],
    notes: null,
    brand: null,
    model: null,
    serial_number: null,
    purchase_date: null,
    price_cents: null,
    order_link: null,
    warranty_ends: null,
    return_ends: null,
    lent_to: null,
    lent_at: null,
    retired_at: null,
    path: [],
    photo_url: null,
    created_at: "2026-11-16T12:00:00Z",
    deleted_at: null,
  };
}

const first = item("first", "HDMI cable");
const second = item("second", "HDMI cable");

test("the item being merged is not offered as the one to merge into", async () => {
  const results = [first, second].map((each) => ({ kind: "item", item: each, marks: [] }));
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify({ results }), { status: 200 }))),
  );
  const { user } = renderWithTheme(<MergeSheet opened item={first} onClose={vi.fn()} />);
  await user.type(screen.getByRole("textbox", { name: "Search items" }), "hdmi");
  const dialog = await screen.findByRole("dialog", { name: "Merge into" });
  expect(await screen.findAllByRole("button", { name: "HDMI cable" })).toHaveLength(1);
  expect(dialog).toBeVisible();
});
