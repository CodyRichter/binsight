import { ListSection } from "@/components/ListSection";
import { TagList } from "@/components/TagList";
import { ValueRow } from "@/components/ValueRow";
import { detailFields, shownValue, typedValue } from "./detailFields";
import type { Item } from "./useItems";

/** An item's details for someone who may not change them: only those filled in, as text. */
export function ItemShownDetails({ item }: { item: Item }) {
  const filled = detailFields
    .map((detail) => ({
      name: detail.name,
      value: shownValue(item, detail) ?? typedValue(item, detail),
    }))
    .filter((detail) => detail.value);
  if (!item.category && item.tags.length === 0 && filled.length === 0) return null;
  return (
    <ListSection title="Details">
      {item.category && (
        <ValueRow beside name="Category">
          {item.category}
        </ValueRow>
      )}
      {item.tags.length > 0 && (
        <ValueRow beside name="Tags">
          <TagList tags={item.tags} tagHref={(tag) => `/search?q=${encodeURIComponent(tag)}`} />
        </ValueRow>
      )}
      {filled.map((detail) => (
        <ValueRow key={detail.name} beside name={detail.name}>
          {detail.value}
        </ValueRow>
      ))}
    </ListSection>
  );
}
