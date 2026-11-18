import { Button } from "@mantine/core";
import { IconMapPin, IconZoomQuestion } from "@tabler/icons-react";
import { useContext, useState } from "react";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { useMarkFound, useMarkMissing } from "./useMarkMissing";
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

/** "Mark missing" on an item's page, or "Mark found" once it is missing. */
export function StatusButton({ item }: { item: Item }) {
  const markMissing = useMarkMissing();
  if (item.status === "missing") return <MarkFoundButton item={item} />;
  return (
    <Button leftSection={<IconZoomQuestion aria-hidden />} onClick={() => markMissing(item)}>
      Mark missing
    </Button>
  );
}
