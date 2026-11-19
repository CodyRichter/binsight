import { useState } from "react";
import { ItemRow } from "@/components/ItemRow";
import type { Mark } from "@/components/markedText";
import { pathSegments } from "./pathSegments";
import type { RowSelect } from "./useItemSelection";
import { useQuantity } from "./useQuantity";
import type { Item } from "./useItems";
import { useAccess } from "@/lib/api/useAccess";

interface ItemListRowProps {
  item: Item;
  showPath: boolean;
  marks?: Mark[];
  /** Since when it has had its status, as a view of lent or archived items shows. */
  since?: string;
  onMove?: () => void;
  select?: RowSelect;
}

interface Shown {
  // The quantity the server last said, so a newer answer replaces what was shown.
  from: number;
  quantity: number;
}

/** An item in a list, with its quantity changed on screen at once wherever the list came from. */
export function ItemListRow(props: ItemListRowProps) {
  const { item, showPath, marks, since, onMove, select } = props;
  const { canEdit } = useAccess();
  const [shown, setShown] = useState<Shown>();
  const changeQuantity = useQuantity(item, (quantity) =>
    setShown({ from: item.quantity, quantity }),
  );
  const quantity = shown?.from === item.quantity ? shown.quantity : item.quantity;
  return (
    <ItemRow
      name={item.name}
      to={`/items/${item.id}`}
      path={showPath ? pathSegments(item.path) : undefined}
      photoUrl={item.photo_url ?? undefined}
      status={item.status}
      lentTo={item.lent_to ?? undefined}
      since={since}
      quantity={quantity}
      onQuantityChange={canEdit ? changeQuantity : undefined}
      marks={marks}
      onMove={onMove}
      select={select}
    />
  );
}
