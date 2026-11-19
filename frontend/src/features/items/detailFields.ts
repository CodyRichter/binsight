import { centsFrom, dateText, priceText } from "./detailValues";
import type { ItemChanges } from "./useItemChange";
import type { Item } from "./useItems";

type TypedField =
  | "notes"
  | "brand"
  | "model"
  | "serial_number"
  | "purchase_date"
  | "price_cents"
  | "order_link"
  | "warranty_ends"
  | "return_ends";

export interface DetailField {
  field: TypedField;
  name: string;
  kind: "text" | "multiline" | "url" | "date" | "price";
}

/** The typed details on an item's page, in the order the Details section lists them. */
export const detailFields: DetailField[] = [
  { field: "notes", name: "Notes", kind: "multiline" },
  { field: "brand", name: "Brand", kind: "text" },
  { field: "model", name: "Model", kind: "text" },
  {
    field: "serial_number",
    name: "Serial number",
    kind: "text",
  },
  {
    field: "purchase_date",
    name: "Purchase date",
    kind: "date",
  },
  { field: "price_cents", name: "Price", kind: "price" },
  { field: "order_link", name: "Order link", kind: "url" },
  { field: "warranty_ends", name: "Warranty ends", kind: "date" },
  { field: "return_ends", name: "Return by", kind: "date" },
];

/** The detail as it is typed in its field. */
export function typedValue(item: Item, { field, kind }: DetailField): string {
  if (kind === "price") return priceText(item.price_cents);
  return (item[field] as string | null) ?? "";
}

/** The detail as it reads at rest, when that differs from how it is typed. */
export function shownValue(item: Item, { field, kind }: DetailField): string | undefined {
  return kind === "date" ? dateText(item[field] as string | null) : undefined;
}

/** The change a typed value makes, or undefined when it isn't a value the field takes. */
export function changeFor({ field, kind }: DetailField, typed: string): ItemChanges | undefined {
  if (!typed) return { [field]: null };
  if (kind !== "price") return { [field]: typed };
  const cents = centsFrom(typed);
  return cents === undefined ? undefined : { price_cents: cents };
}
