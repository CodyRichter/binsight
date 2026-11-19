import { useContext, useState } from "react";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { ListSection } from "@/components/ListSection";
import { ItemListRow } from "./ItemListRow";
import { useMoveItem } from "./useMoveItem";
import type { RowSelect } from "./useItemSelection";
import type { Item } from "./useItems";

interface ItemsSectionProps {
  items: Item[];
  showPath: boolean;
  select?: (item: Item) => RowSelect;
}

export function ItemsSection({ items, showPath, select }: ItemsSectionProps) {
  const { MoveSheet } = useContext(FrameAdditionsContext);
  const [moving, setMoving] = useState<Item>();
  const move = useMoveItem();
  if (items.length === 0) return null;
  // A location's own contents, shown without paths, is where rows offer Move.
  const movable = !showPath && MoveSheet !== undefined;
  return (
    <>
      <ListSection title="Items" count={items.length}>
        {items.map((item) => (
          <ItemListRow
            key={item.id}
            item={item}
            showPath={showPath}
            onMove={movable ? () => setMoving(item) : undefined}
            select={select?.(item)}
          />
        ))}
      </ListSection>
      {MoveSheet && (
        <MoveSheet
          opened={moving !== undefined}
          onClose={() => setMoving(undefined)}
          currentId={moving?.home_location_id ?? null}
          onPick={(place) => moving && move(moving, place)}
        />
      )}
    </>
  );
}
