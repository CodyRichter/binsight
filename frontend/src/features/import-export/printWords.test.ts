import { describe, expect, it } from "vitest";
import { insuranceCounts, insuredDetails, statusNote } from "./printWords";
import type { InsuranceList, InsuredItem } from "./usePrintPages";

const item: InsuredItem = {
  id: "drill",
  name: "Drill",
  quantity: 1,
  status: "in_place",
  path: [],
  brand: "Makita",
  model: null,
  serial_number: "SN-1",
  purchase_date: null,
  price_cents: 12950,
  order_link: null,
  photo_urls: [],
  receipts: [
    { name: "Receipt.pdf", url: "/api/attachments/a/file" },
    { name: "Order", url: "https://example.com/order" },
  ],
};

const list: InsuranceList = {
  title: "Everything",
  path: [],
  made_at: "2026-11-18T12:00:00Z",
  item_count: 3,
  total_cents: 25900,
  items_without_price: 1,
  items: [item],
};

describe("printWords", () => {
  it("prints only the details that were entered, the price as typed", () => {
    expect(insuredDetails(item)).toEqual([
      { name: "Where", value: "Inbox" },
      { name: "Brand", value: "Makita" },
      { name: "Serial number", value: "SN-1" },
      { name: "Price", value: "129.50" },
      { name: "Receipts", value: "Receipt.pdf, Order" },
    ]);
  });

  it("prints the price of several as their total, with the price of each", () => {
    const blankets = { ...item, quantity: 3, price_cents: 200 };
    expect(insuredDetails(blankets)).toContainEqual({ name: "Price", value: "6.00 (2.00 each)" });
  });

  it("counts the items, totals them and says how many have no price", () => {
    expect(insuranceCounts(list)).toEqual(["3 items", "Total 259.00", "1 item has no price"]);
    expect(insuranceCounts({ ...list, item_count: 1, items_without_price: 0 })).toEqual([
      "1 item",
      "Total 259.00",
    ]);
  });

  it("notes an item only when it is not in its place", () => {
    expect(statusNote("in_place")).toBeUndefined();
    expect(statusNote("lent_out")).toBe("Lent out");
  });
});
