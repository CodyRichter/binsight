import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { ItemRow } from "@/components/ItemRow";
import { NameRow } from "@/components/NameRow";
import { Sheet } from "@/components/Sheet";
import { pathSegments } from "./pathSegments";
import { itemName } from "./placeName";
import { useItemSearch, useLinkItems, type NewLink } from "./useItemLinks";
import type { Item } from "./useItems";

interface LinkSheetProps {
  opened: boolean;
  item: Item;
  /** Items already linked, left out of what is offered. */
  linkedIds: string[];
  onClose: () => void;
}

function kinds(item: Item, other: Item): { words: string; link: NewLink }[] {
  const name = itemName(other.name);
  return [
    { words: `Belongs with ${name}`, link: { from: item, to: other, kind: "belongs_with" } },
    { words: `Part of ${name}`, link: { from: item, to: other, kind: "part_of" } },
    { words: `${name} is a part of this`, link: { from: other, to: item, kind: "part_of" } },
  ];
}

/** Linking an item: search for the other one, then say how the two go together. */
export function LinkSheet({ opened, item, linkedIds, onClose }: LinkSheetProps) {
  const [query, setQuery] = useState("");
  const [other, setOther] = useState<Item>();
  const found = useItemSearch(opened ? query : "").data ?? [];
  const link = useLinkItems();
  const close = () => {
    setQuery("");
    setOther(undefined);
    onClose();
  };
  const offered = found.filter((each) => each.id !== item.id && !linkedIds.includes(each.id));
  const rows = other
    ? kinds(item, other).map(({ words, link: made }) => (
        <NameRow
          key={words}
          name={words}
          onPick={() => {
            close();
            link(made, itemName(other.name));
          }}
        />
      ))
    : offered.map((each) => (
        <ItemRow
          key={each.id}
          name={each.name}
          path={pathSegments(each.path)}
          photoUrl={each.photo_url ?? undefined}
          status={each.status}
          lentTo={each.lent_to ?? undefined}
          onPick={() => setOther(each)}
        />
      ));
  return (
    <Sheet opened={opened} title="Link an item" onClose={close} rows={rows}>
      {!other && (
        <TextInput
          aria-label="Search items"
          placeholder="Search items"
          data-autofocus
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          leftSection={<IconSearch aria-hidden size={20} />}
        />
      )}
    </Sheet>
  );
}
