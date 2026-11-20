import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { ItemRow } from "@/components/ItemRow";
import { Sheet } from "@/components/Sheet";
import { pathSegments } from "./pathSegments";
import { useItemSearch } from "./useItemLinks";
import { useOwnItemOf } from "./useOwnItem";

interface OwnItemSheetProps {
  opened: boolean;
  locationId: string;
  onClose: () => void;
}

/** Choosing an item already made, such as a desk, to be a location's own item. */
export function OwnItemSheet({ opened, locationId, onClose }: OwnItemSheetProps) {
  const [query, setQuery] = useState("");
  const found = useItemSearch(opened ? query : "").data ?? [];
  const ownItemOf = useOwnItemOf();
  const close = () => {
    setQuery("");
    onClose();
  };
  const rows = found
    .filter((each) => each.own_item_of === null)
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
          ownItemOf(each, locationId);
        }}
      />
    ));
  return (
    <Sheet opened={opened} title="Use an existing item" onClose={close} rows={rows}>
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
