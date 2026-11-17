import { ItemRow } from "@/components/ItemRow";
import { pathSegments } from "./pathSegments";
import { useQuantity } from "./useQuantity";
import type { Item } from "./useItems";

interface ItemListRowProps {
  item: Item;
  showPath: boolean;
}

export function ItemListRow({ item, showPath }: ItemListRowProps) {
  const changeQuantity = useQuantity(item);
  return (
    <ItemRow
      name={item.name ?? ""}
      to={`/items/${item.id}`}
      path={showPath ? pathSegments(item) : undefined}
      quantity={item.quantity}
      onQuantityChange={changeQuantity}
    />
  );
}
