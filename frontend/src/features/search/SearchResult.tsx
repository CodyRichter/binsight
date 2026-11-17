import { LocationRow } from "@/components/LocationRow";
import { ItemListRow } from "@/features/items";
import type { SearchResult as Result } from "./useSearch";

/** One thing a search found: an item with its path, or a location in a flat list. */
export function SearchResult({ result }: { result: Result }) {
  if (result.kind === "item") {
    return <ItemListRow item={result.item} showPath marks={result.marks} />;
  }
  const { location } = result;
  return (
    <LocationRow
      name={location.name}
      locationType={location.type}
      code={location.label_code ?? undefined}
      itemCount={location.item_count}
      to={`/locations/${location.id}`}
      marks={result.marks}
    />
  );
}
