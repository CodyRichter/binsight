import { useState } from "react";
import { ChosenValue } from "@/components/ChosenValue";
import { EditableText } from "@/components/EditableText";
import { ListSection } from "@/components/ListSection";
import { TagList } from "@/components/TagList";
import { ValueRow } from "@/components/ValueRow";
import { CategorySheet } from "./CategorySheet";
import { changeFor, detailFields, shownValue, typedValue, type DetailField } from "./detailFields";
import { TagSheet } from "./TagSheet";
import { useDetailChange } from "./useDetailChange";
import type { Item } from "./useItems";

const inputKinds = {
  text: {},
  multiline: { multiline: true },
  url: { type: "url" },
  date: { type: "date" },
  price: { inputMode: "decimal" },
} as const;

function DetailRow({ item, detail }: { item: Item; detail: DetailField }) {
  const change = useDetailChange(item);
  const save = (typed: string) => {
    // What isn't a price is not saved, so the field goes back to the price it had.
    const changes = changeFor(detail, typed);
    if (changes) change(changes, `Changed ${detail.name.toLowerCase()}`);
  };
  return (
    <ValueRow beside name={detail.name}>
      <EditableText
        value={typedValue(item, detail)}
        display={shownValue(item, detail)}
        label={detail.name}
        invitation="Add"
        onSave={save}
        {...inputKinds[detail.kind]}
      />
    </ValueRow>
  );
}

/** An item's category, tags and details, each changed where it is shown. */
export function ItemDetails({ item }: { item: Item }) {
  const change = useDetailChange(item);
  const [picking, setPicking] = useState<"category" | "tag">();
  const setCategory = (category: string | null) =>
    change({ category }, category ? `Category set to ${category}` : "Removed category");
  const addTag = (tag: string) => change({ tags: [...item.tags, tag].sort() }, `Tagged ${tag}`);
  const removeTag = (tag: string) =>
    change({ tags: item.tags.filter((each) => each !== tag) }, `Removed tag ${tag}`);
  return (
    <>
      <ListSection title="Details">
        <ValueRow beside name="Category">
          <ChosenValue
            value={item.category}
            label="Category"
            invitation="Add"
            onChoose={() => setPicking("category")}
          />
        </ValueRow>
        <ValueRow beside name="Tags">
          <TagList
            tags={item.tags}
            tagHref={(tag) => `/search?q=${encodeURIComponent(tag)}`}
            onRemoveTag={removeTag}
            onAddTag={() => setPicking("tag")}
          />
        </ValueRow>
        {detailFields.map((detail) => (
          <DetailRow key={detail.field} item={item} detail={detail} />
        ))}
      </ListSection>
      <CategorySheet
        opened={picking === "category"}
        current={item.category}
        onPick={setCategory}
        onClose={() => setPicking(undefined)}
      />
      <TagSheet
        opened={picking === "tag"}
        current={item.tags}
        onAdd={addTag}
        onClose={() => setPicking(undefined)}
      />
    </>
  );
}
