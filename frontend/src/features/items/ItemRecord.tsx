import { Button, Menu } from "@mantine/core";
import { IconArrowBackUp, IconArrowsMove, IconTrash } from "@tabler/icons-react";
import { useContext, useState } from "react";
import { useParams } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ItemHistory } from "@/features/history";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { pathSegments } from "./pathSegments";
import { useRename } from "./useItemChange";
import { useMoveItem } from "./useMoveItem";
import { useItem, type Item } from "./useItems";
import { useQuantity } from "./useQuantity";
import { useDeleteItem } from "./useDeleteItem";
import { useRestoreItem } from "./useRestoreItem";

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

function RestoreButton({ item }: { item: Item }) {
  const restore = useRestoreItem();
  return (
    <Button leftSection={<IconArrowBackUp aria-hidden />} onClick={() => restore(item)}>
      Restore
    </Button>
  );
}

function DeleteMenuItem({ item }: { item: Item }) {
  const deleteItem = useDeleteItem();
  return (
    <Menu.Item
      color="danger"
      leftSection={<IconTrash aria-hidden size={20} />}
      onClick={() => deleteItem(item)}
    >
      Delete item
    </Menu.Item>
  );
}

function ItemBody({ item }: { item: Item }) {
  const changeQuantity = useQuantity(item);
  const rename = useRename(item);
  const deleted = item.deleted_at !== null;
  return (
    <>
      <PageLead
        header={
          <PageHeader
            title={item.name ?? ""}
            untitled="Unnamed"
            onRename={rename}
            parents={pathSegments(item.path)}
            thumbnail={{ photoUrl: item.photo_url ?? undefined }}
            deletedAt={item.deleted_at ? new Date(item.deleted_at) : undefined}
            actions={deleted ? <RestoreButton item={item} /> : <MoveButton item={item} />}
            menu={deleted ? undefined : <DeleteMenuItem item={item} />}
          />
        }
      >
        <QuantityStepper value={item.quantity} onChange={changeQuantity} />
      </PageLead>
      <ItemHistory itemId={item.id} />
    </>
  );
}

export function ItemRecord() {
  const { id = "" } = useParams();
  const item = useItem(id);
  const home = item.data?.home_location_id;
  return (
    <AppFrame current="home" parent={home ? `/locations/${home}` : "/"}>
      <PageState status={pageStatusOf(item)} onRetry={() => void item.refetch()}>
        {item.data && <ItemBody key={item.data.id} item={item.data} />}
      </PageState>
    </AppFrame>
  );
}
