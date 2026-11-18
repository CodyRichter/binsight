import type { Item } from "./useItems";

/** The details of an item that has none yet: what a newly added item holds, not lent or retired. */
export const noDetails = {
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
} satisfies Partial<Item>;
