import { screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { ItemHeader } from "./ItemHeader";
import type { Item } from "./useItems";

function sampleItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    name: "BMC Roadmachine Bike",
    quantity: 1,
    home_location_id: "loc-2",
    own_item_of: null,
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
    path: [
      { id: "loc-1", name: "Den", type: "room" },
      { id: "loc-2", name: "Bike Rack", type: "furniture" },
    ],
    photo_url: null,
    created_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

function renderHeader(overrides: Partial<Item> = {}) {
  return renderWithTheme(
    <ItemHeader item={sampleItem(overrides)} linkedIds={[]} onAttach={vi.fn()} />,
  );
}

test("a live item renders the quantity stepper inside the header", () => {
  renderHeader({ quantity: 3 });
  const header = screen.getByRole("banner");
  expect(within(header).getByRole("button", { name: "Quantity 3, type a number" })).toBeVisible();
  expect(within(header).getByRole("button", { name: "One more" })).toBeVisible();
});

test("an item without a photo has an Add photo thumbnail button wired to the photo input", async () => {
  const { user } = renderHeader({ photo_url: null });
  const input = screen.getByLabelText("Item photo");
  const clicked = vi.spyOn(input, "click");
  await user.click(screen.getByRole("button", { name: "Add photo" }));
  expect(clicked).toHaveBeenCalledOnce();
});

test("an item that already has a photo does not offer Add photo on its thumbnail", () => {
  renderHeader({ photo_url: "/api/attachments/photo-1/file" });
  expect(screen.queryByRole("button", { name: "Add photo" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Item photo")).not.toBeInTheDocument();
});

test("a deleted item omits the quantity stepper, Add photo button, and More", () => {
  renderHeader({ deleted_at: "2026-01-02T00:00:00Z" });
  expect(screen.getByRole("button", { name: "Restore" })).toBeVisible();
  expect(screen.queryByRole("button", { name: /Quantity/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add photo" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
});
