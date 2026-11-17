import { Button } from "@mantine/core";
import { IconArrowsMove } from "@tabler/icons-react";
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

function ItemBody({ item }: { item: Item }) {
  const changeQuantity = useQuantity(item);
  const rename = useRename(item);
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
            actions={<MoveButton item={item} />}
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
