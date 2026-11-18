import { Button } from "@mantine/core";
import { IconArrowBack, IconHome, IconMapPin, IconZoomQuestion } from "@tabler/icons-react";
import { useContext, useState } from "react";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { useMarkFound, useMarkMissing } from "./useMarkMissing";
import { useReturn, useStatusChange } from "./useStatusChange";
import type { Item } from "./useItems";

function MarkFoundButton({ item }: { item: Item }) {
  const { MoveSheet } = useContext(FrameAdditionsContext);
  const [asking, setAsking] = useState(false);
  const markFound = useMarkFound();
  if (!MoveSheet) return null;
  return (
    <>
      <Button leftSection={<IconMapPin aria-hidden />} onClick={() => setAsking(true)}>
        Mark found
      </Button>
      <MoveSheet
        opened={asking}
        onClose={() => setAsking(false)}
        title="Where is it now?"
        currentId={item.home_location_id}
        offerCurrent
        onPick={(place) => markFound(item, place)}
      />
    </>
  );
}

/** The header's second button, for what the item's status most likely needs next. */
export function StatusButton({ item }: { item: Item }) {
  const markMissing = useMarkMissing();
  const returnItem = useReturn();
  const changeStatus = useStatusChange();
  if (item.status === "missing") return <MarkFoundButton item={item} />;
  if (item.status === "lent_out") {
    return (
      <Button leftSection={<IconArrowBack aria-hidden />} onClick={() => returnItem(item)}>
        Mark returned
      </Button>
    );
  }
  if (item.status !== "in_place") {
    return (
      <Button leftSection={<IconHome aria-hidden />} onClick={() => changeStatus(item, "in_place")}>
        Back in place
      </Button>
    );
  }
  return (
    <Button leftSection={<IconZoomQuestion aria-hidden />} onClick={() => markMissing(item)}>
      Mark missing
    </Button>
  );
}
