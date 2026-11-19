import { Button } from "@mantine/core";
import { IconArrowBackUp, IconArrowsMove } from "@tabler/icons-react";
import { useContext, useRef, useState } from "react";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { PageHeader } from "@/components/PageHeader";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ItemMenu } from "./ItemMenu";
import { ItemPhotoInput } from "./ItemPhotoInput";
import { LendSheet } from "./LendSheet";
import { LinkSheet } from "./LinkSheet";
import { MergeSheet } from "./MergeSheet";
import { pathSegments } from "./pathSegments";
import { StatusButton } from "./StatusButton";
import { StatusSheet } from "./StatusSheet";
import { useRename } from "./useItemChange";
import { useMoveItem } from "./useMoveItem";
import { useQuantity } from "./useQuantity";
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

/** An item page's header: its path, name, status, quantity, buttons, and More. */
export function ItemHeader({ item, linkedIds, onAttach }: ItemHeaderProps) {
  const rename = useRename(item);
  const changeQuantity = useQuantity(item);
  const restore = useRestoreItem();
  const lend = useLend();
  const [sheet, setSheet] = useState<"status" | "lend" | "link" | "merge">();
  const close = () => setSheet(undefined);
  const photoInput = useRef<HTMLInputElement>(null);
  const deleted = Boolean(item.deleted_at);
  const canAddPhoto = !deleted && !item.photo_url;
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
      onChangeStatus={() => setSheet("status")}
      onLink={() => setSheet("link")}
      onAttach={onAttach}
      onMerge={() => setSheet("merge")}
    />
  );
  return (
    <>
      <PageHeader
        title={item.name ?? ""}
        untitled="Unnamed"
        onRename={rename}
        parents={pathSegments(item.path)}
        thumbnail={{
          photoUrl: item.photo_url ?? undefined,
          action: canAddPhoto
            ? { label: "Add photo", onClick: () => photoInput.current?.click() }
            : undefined,
        }}
        since={since(item)}
        status={{ status: item.status, lentTo: item.lent_to ?? undefined }}
        quantity={
          deleted ? undefined : <QuantityStepper value={item.quantity} onChange={changeQuantity} />
        }
        actions={actions}
        menu={deleted ? undefined : menu}
      />
      {canAddPhoto && <ItemPhotoInput item={item} inputRef={photoInput} />}
      <StatusSheet
        item={item}
        opened={sheet === "status"}
        onClose={close}
        onLend={() => setSheet("lend")}
      />
      <LendSheet opened={sheet === "lend"} onLend={(name) => lend(item, name)} onClose={close} />
      <LinkSheet opened={sheet === "link"} item={item} linkedIds={linkedIds} onClose={close} />
      <MergeSheet opened={sheet === "merge"} item={item} onClose={close} />
    </>
  );
}
