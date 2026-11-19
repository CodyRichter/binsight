import { Button } from "@mantine/core";
import { IconArrowBackUp, IconArrowsMove } from "@tabler/icons-react";
import { useContext, useState } from "react";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { PageHeader } from "@/components/PageHeader";
import { LendSheet } from "./LendSheet";
import { ItemMenu } from "./ItemMenu";
import { LinkSheet } from "./LinkSheet";
import { MergeSheet } from "./MergeSheet";
import { pathSegments } from "./pathSegments";
import { StatusButton } from "./StatusButton";
import { useRename } from "./useItemChange";
import { useMoveItem } from "./useMoveItem";
import { useRestoreItem } from "./useRestoreItem";
import { useLend } from "./useStatusChange";
import type { Item } from "./useItems";

function MoveButton({ item }: { item: Item }) {
  const { MoveSheet } = useContext(FrameAdditionsContext);
  const [moving, setMoving] = useState(false);
  const move = useMoveItem();
  if (!MoveSheet) return null;
  return (
    <>
      <Button leftSection={<IconArrowsMove aria-hidden />} onClick={() => setMoving(true)}>
        Move
      </Button>
      <MoveSheet
        opened={moving}
        onClose={() => setMoving(false)}
        currentId={item.home_location_id}
        onPick={(place) => move(item, place)}
      />
    </>
  );
}

const sinceWords: Partial<Record<Item["status"], string>> = {
  lent_out: "Lent",
  sold: "Sold",
  given_away: "Given away",
  thrown_away: "Thrown away",
};

function since(item: Item): { words: string; at: Date } | undefined {
  if (item.deleted_at) return { words: "Deleted", at: new Date(item.deleted_at) };
  const words = sinceWords[item.status];
  const at = item.status === "lent_out" ? item.lent_at : item.retired_at;
  return words && at ? { words, at: new Date(at) } : undefined;
}

interface ItemHeaderProps {
  item: Item;
  linkedIds: string[];
  onAttach: () => void;
}

/** An item page's header: its path, name and status, its buttons, and More. */
export function ItemHeader({ item, linkedIds, onAttach }: ItemHeaderProps) {
  const rename = useRename(item);
  const restore = useRestoreItem();
  const lend = useLend();
  const [lending, setLending] = useState(false);
  const [linking, setLinking] = useState(false);
  const [merging, setMerging] = useState(false);
  const deleted = item.deleted_at !== null;
  const actions = deleted ? (
    <Button leftSection={<IconArrowBackUp aria-hidden />} onClick={() => restore(item)}>
      Restore
    </Button>
  ) : (
    <>
      <MoveButton item={item} />
      <StatusButton item={item} />
    </>
  );
  const menu = (
    <ItemMenu
      item={item}
      onLend={() => setLending(true)}
      onLink={() => setLinking(true)}
      onAttach={onAttach}
      onMerge={() => setMerging(true)}
    />
  );
  return (
    <>
      <PageHeader
        title={item.name ?? ""}
        untitled="Unnamed"
        onRename={rename}
        parents={pathSegments(item.path)}
        thumbnail={{ photoUrl: item.photo_url ?? undefined }}
        since={since(item)}
        status={{ status: item.status, lentTo: item.lent_to ?? undefined }}
        actions={actions}
        menu={deleted ? undefined : menu}
      />
      <LendSheet
        opened={lending}
        onLend={(name) => lend(item, name)}
        onClose={() => setLending(false)}
      />
      <LinkSheet
        opened={linking}
        item={item}
        linkedIds={linkedIds}
        onClose={() => setLinking(false)}
      />
      <MergeSheet opened={merging} item={item} onClose={() => setMerging(false)} />
    </>
  );
}
