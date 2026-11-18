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
  invitation: string;
  kind: "text" | "multiline" | "url" | "date" | "price";
}

/** The typed details on an item's page, in the order the Details section lists them. */
export const detailFields: DetailField[] = [
  { field: "notes", name: "Notes", invitation: "Add notes", kind: "multiline" },
  { field: "brand", name: "Brand", invitation: "Add a brand", kind: "text" },
  { field: "model", name: "Model", invitation: "Add a model", kind: "text" },
  {
    field: "serial_number",
    name: "Serial number",
    invitation: "Add a serial number",
    kind: "text",
  },
  {
    field: "purchase_date",
    name: "Purchase date",
    invitation: "Add a purchase date",
    kind: "date",
  },
  { field: "price_cents", name: "Price", invitation: "Add a price", kind: "price" },
  { field: "order_link", name: "Order link", invitation: "Add an order link", kind: "url" },
  { field: "warranty_ends", name: "Warranty ends", invitation: "Add a warranty end", kind: "date" },
  { field: "return_ends", name: "Return by", invitation: "Add a return date", kind: "date" },
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
