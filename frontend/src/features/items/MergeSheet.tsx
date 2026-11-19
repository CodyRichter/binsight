import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { ItemRow } from "@/components/ItemRow";
import { Sheet } from "@/components/Sheet";
import { pathSegments } from "./pathSegments";
import { useMergeItem } from "./useItemDuplicates";
import { useItemSearch } from "./useItemLinks";
import type { Item } from "./useItems";

interface MergeSheetProps {
  opened: boolean;
  item: Item;
  onClose: () => void;
}

/** Merging an item recorded twice: search for the other record, and picking it merges. */
export function MergeSheet({ opened, item, onClose }: MergeSheetProps) {
  const [query, setQuery] = useState("");
  const found = useItemSearch(opened ? query : "").data ?? [];
  const merge = useMergeItem();
  const close = () => {
    setQuery("");
    onClose();
  };
  const rows = found
    .filter((each) => each.id !== item.id)
    .map((each) => (
      <ItemRow
        key={each.id}
        name={each.name}
        path={pathSegments(each.path)}
        photoUrl={each.photo_url ?? undefined}
        status={each.status}
        lentTo={each.lent_to ?? undefined}
        onPick={() => {
          close();
          merge(item, each);
        }}
      />
    ));
  return (
    <Sheet opened={opened} title="Merge into" onClose={close} rows={rows}>
      <TextInput
        aria-label="Search items"
        placeholder="Search items"
        data-autofocus
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<IconSearch aria-hidden size={20} />}
      />
    </Sheet>
  );
}
