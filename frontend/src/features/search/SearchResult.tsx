import { LocationRow } from "@/components/LocationRow";
import { ItemListRow, type Item, type ItemSelection } from "@/features/items";
import type { SearchResult as Result } from "./useSearch";

interface SearchResultProps {
  result: Result;
  selection: ItemSelection;
  /** Opens the move sheet for an item found; left out where nothing can be moved. */
  onMove?: (item: Item) => void;
}

/** One thing a search found: an item with its path, or a location in a flat list. */
export function SearchResult({ result, selection, onMove }: SearchResultProps) {
  if (result.kind === "item") {
    const { item } = result;
    return (
      <ItemListRow
        item={item}
        showPath
        marks={result.marks}
        onMove={onMove && (() => onMove(item))}
        select={selection.select(item)}
      />
    );
  }
  const { location } = result;
  return (
    <LocationRow
      name={location.name}
      locationType={location.type}
      locationIcon={location.icon}
      code={location.id}
      itemCount={location.item_count}
      to={`/locations/${location.id}`}
      marks={result.marks}
    />
  );
}
