import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithTheme } from "@/lib/testing/renderWithTheme";
import { noDetails } from "./noDetails";
import { OwnItemCard } from "./OwnItemCard";
import type { Item } from "./useItems";

afterEach(() => {
  vi.unstubAllGlobals();
});

function desk(details: Partial<Item>): Item {
  return {
    ...noDetails,
    id: "desk",
    name: "Desk",
    quantity: 1,
    home_location_id: "K7Q-4MZ",
    own_item_of: "K7Q-4MZ",
    path: [],
    photo_url: null,
    created_at: "2026-11-16T12:00:00Z",
    deleted_at: null,
    status: "in_place",
    ...details,
  };
}

function answering(item: Item) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(item), { status: 200 }))),
  );
}

test("the card shows what the location is worth and opens its item", async () => {
  answering(desk({ price_cents: 150000, brand: "Fully", notes: "Standing desk" }));
  renderWithTheme(<OwnItemCard itemId="desk" />);
  expect(await screen.findByText("1500.00")).toBeVisible();
  expect(screen.getByText("Fully")).toBeVisible();
  expect(screen.queryByText("Standing desk")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open item" })).toHaveAttribute("href", "/items/desk");
});

test("with nothing filled in, the card says so without asking for more", async () => {
  answering(desk({}));
  renderWithTheme(<OwnItemCard itemId="desk" />);
  expect(await screen.findByText("None yet")).toBeVisible();
});

test("a sold desk says so", async () => {
  answering(desk({ status: "sold", retired_at: "2026-11-18T12:00:00Z" }));
  renderWithTheme(<OwnItemCard itemId="desk" />);
  expect(await screen.findByText("Sold")).toBeVisible();
});
