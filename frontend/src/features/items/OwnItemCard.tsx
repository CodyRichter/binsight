import { Button } from "@mantine/core";
import { Link } from "react-router";
import { ListSection } from "@/components/ListSection";
import { ValueRow } from "@/components/ValueRow";
import { detailFields, shownValue, typedValue } from "./detailFields";
import { since } from "./itemSince";
import { useItem, type Item } from "./useItems";

// What a piece of furniture is worth knowing at a glance; notes and links stay on its page.
const shown = new Set([
  "brand",
  "model",
  "serial_number",
  "purchase_date",
  "price_cents",
  "warranty_ends",
]);

function filledRows(item: Item) {
  const rows = detailFields
    .filter((detail) => shown.has(detail.field))
    .map((detail) => ({
      name: detail.name,
      value: shownValue(item, detail) ?? typedValue(item, detail),
    }))
    .filter((row) => row.value);
  const status = since(item)?.words;
  return status ? [{ name: "Status", value: status }, ...rows] : rows;
}

/** A location's own item on the location's page: what it's worth, with the way to its page. */
export function OwnItemCard({ itemId }: { itemId: string }) {
  const item = useItem(itemId).data;
  if (!item) return null;
  const rows = filledRows(item);
  return (
    <ListSection
      title="As an item"
      action={
        <Button variant="subtle" component={Link} to={`/items/${item.id}`}>
          Open item
        </Button>
      }
    >
      {rows.length > 0 ? (
        rows.map((row) => (
          <ValueRow key={row.name} beside name={row.name}>
            {row.value}
          </ValueRow>
        ))
      ) : (
        <ValueRow beside name="Details">
          <span data-empty>None yet</span>
        </ValueRow>
      )}
    </ListSection>
  );
}
