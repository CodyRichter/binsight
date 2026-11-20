import { dateText, priceText } from "@/features/items";
import type { components } from "@/types/api.generated";
import type { InsuranceList, InsuredItem } from "./usePrintPages";

type ItemStatus = components["schemas"]["ItemStatus"];

const statusWords: Partial<Record<ItemStatus, string>> = {
  in_use: "In use",
  lent_out: "Lent out",
  missing: "Missing",
};

/** The word printed after an item's name when it is not in its place. */
export function statusNote(status: ItemStatus): string | undefined {
  return statusWords[status];
}

/** An item's price times its quantity, with the price of one when there are several. */
function insuredPrice({ price_cents, quantity }: InsuredItem): string | undefined {
  if (price_cents === null) return undefined;
  const total = priceText(price_cents * quantity);
  return quantity > 1 ? `${total} (${priceText(price_cents)} each)` : total;
}

/** The details an insurance list prints for an item, leaving out the ones not entered. */
export function insuredDetails(item: InsuredItem): { name: string; value: string }[] {
  const details: [string, string | undefined][] = [
    ["Where", item.path.map((step) => step.name).join(" > ") || "Inbox"],
    ["Brand", item.brand ?? undefined],
    ["Model", item.model ?? undefined],
    ["Serial number", item.serial_number ?? undefined],
    ["Purchase date", dateText(item.purchase_date)],
    ["Price", insuredPrice(item)],
    ["Order link", item.order_link ?? undefined],
    ["Receipts", item.receipts.map((receipt) => receipt.name).join(", ") || undefined],
  ];
  return details.flatMap(([name, value]) => (value ? [{ name, value }] : []));
}

/** The counts under an insurance list's title: how many items, the total, and any unpriced. */
export function insuranceCounts(list: InsuranceList): string[] {
  const counts = [
    list.item_count === 1 ? "1 item" : `${list.item_count} items`,
    `Total ${priceText(list.total_cents)}`,
  ];
  const unpriced = list.items_without_price;
  if (unpriced > 0)
    counts.push(unpriced === 1 ? "1 item has no price" : `${unpriced} items have no price`);
  return counts;
}
