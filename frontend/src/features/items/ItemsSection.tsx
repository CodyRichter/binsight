import { ListSection } from "@/components/ListSection";
import { ItemListRow } from "./ItemListRow";
import type { Item } from "./useItems";

interface ItemsSectionProps {
  items: Item[];
  showPath: boolean;
}

export function ItemsSection({ items, showPath }: ItemsSectionProps) {
  if (items.length === 0) return null;
  return (
    <ListSection title="Items" count={items.length}>
      {items.map((item) => (
        <ItemListRow key={item.id} item={item} showPath={showPath} />
      ))}
    </ListSection>
  );
}
