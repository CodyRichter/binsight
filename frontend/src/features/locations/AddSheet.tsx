import { Button } from "@mantine/core";
import { useState } from "react";
import type { AddSheetProps } from "@/components/frameAdditions";
import { Sheet } from "@/components/Sheet";
import { ItemAdder } from "@/features/items";
import { Tree } from "./LocationTree";
import { useLocationTree, useRefreshLocationTree } from "./useLocations";

function AddSheetBody({ locationId }: { locationId?: string }) {
  const tree = useLocationTree();
  const refreshTree = useRefreshLocationTree();
  // Undefined until a destination is picked, so adding starts where the page is.
  const [picked, setPicked] = useState<string | null>();
  const [choosing, setChoosing] = useState(false);
  const homeId = picked === undefined ? (locationId ?? null) : picked;
  const home = tree.data?.find((location) => location.id === homeId) ?? null;
  const pick = (id: string | null) => {
    setPicked(id);
    setChoosing(false);
  };
  if (choosing && tree.data) {
    return (
      <Tree
        locations={tree.data}
        heading={{
          title: "Add to",
          action: (
            <Button variant="subtle" onClick={() => pick(null)}>
              Inbox
            </Button>
          ),
        }}
        onPick={(location) => pick(location.id)}
      />
    );
  }
  return (
    <ItemAdder
      home={home}
      onSettled={refreshTree}
      onChangeDestination={() => setChoosing(true)}
      autoFocus
    />
  );
}

/** Add from anywhere: the add bar, starting at the page's location or the inbox. */
export function AddSheet({ opened, onClose, locationId }: AddSheetProps) {
  return (
    <Sheet opened={opened} title="Add" onClose={onClose}>
      {opened && <AddSheetBody locationId={locationId} />}
    </Sheet>
  );
}
