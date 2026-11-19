import { useContext, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { TaskFrame } from "@/components/TaskFrame";
import {
  ItemAdder,
  useLocationItems,
  useMoveItem,
  type Destination,
  type Item,
} from "@/features/items";
import { useCheckLocation } from "./useCheckLocation";

interface CheckModeProps {
  location: Destination;
  onClose: () => void;
  /** Called once something added here is saved, so counts elsewhere are read again. */
  onAdded: () => void;
}

/** Ticking through a location's items, moving out what belongs elsewhere; finishing marks the rest missing. */
export function CheckMode({ location, onClose, onAdded }: CheckModeProps) {
  const items = useLocationItems(location.id, false).data ?? [];
  const inPlace = items.filter((item) => item.status === "in_place");
  // Only what was there when check mode opened can be missing; anything added since was in hand.
  const [listed] = useState(() => new Set(inPlace.map((item) => item.id)));
  const [ticked, setTicked] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const check = useCheckLocation(location.id);
  const { MoveSheet } = useContext(FrameAdditionsContext);
  const [moving, setMoving] = useState<Item>();
  const move = useMoveItem();
  const isTicked = (id: string) => !listed.has(id) || ticked.includes(id);
  const unticked = inPlace.filter((item) => !isTicked(item.id)).map((item) => item.id);
  const finish = () => {
    check(unticked);
    onClose();
  };
  return (
    <TaskFrame
      name={`Check ${location.name}`}
      onClose={onClose}
      action={{
        label: "Contents checked",
        onClick: () => (unticked.length > 0 ? setAsking(true) : finish()),
      }}
    >
      <ItemAdder home={location} onSettled={onAdded} />
      <ListSection>
        {inPlace.map((item) => (
          <ItemRow
            key={item.id}
            name={item.name}
            to={`/items/${item.id}`}
            onMove={MoveSheet && (() => setMoving(item))}
            check={{
              checked: isTicked(item.id),
              onChange: (on) =>
                setTicked(on ? [...ticked, item.id] : ticked.filter((other) => other !== item.id)),
            }}
          />
        ))}
      </ListSection>
      {MoveSheet && (
        <MoveSheet
          opened={moving !== undefined}
          onClose={() => setMoving(undefined)}
          currentId={location.id}
          onPick={(place) => moving && move(moving, place)}
        />
      )}
      <ConfirmDialog
        opened={asking}
        title={`Mark ${unticked.length} unchecked ${unticked.length === 1 ? "item" : "items"} missing?`}
        detail="You can mark them found later if they turn up."
        cancelLabel="Keep checking"
        confirmLabel="Mark missing"
        onCancel={() => setAsking(false)}
        onConfirm={finish}
      />
    </TaskFrame>
  );
}
