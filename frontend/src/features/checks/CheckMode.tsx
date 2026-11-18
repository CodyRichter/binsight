import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { TaskFrame } from "@/components/TaskFrame";
import { ItemAdder, useLocationItems, type Destination } from "@/features/items";
import { useCheckLocation } from "./useCheckLocation";

interface CheckModeProps {
  location: Destination;
  onClose: () => void;
  /** Called once something added here is saved, so counts elsewhere are read again. */
  onAdded: () => void;
}

/** Ticking through a location's items; finishing records a check and marks the rest missing. */
export function CheckMode({ location, onClose, onAdded }: CheckModeProps) {
  const items = useLocationItems(location.id, false).data ?? [];
  const inPlace = items.filter((item) => item.status === "in_place");
  // Only what was there when check mode opened can be missing; anything added since was in hand.
  const [listed] = useState(() => new Set(inPlace.map((item) => item.id)));
  const [ticked, setTicked] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const check = useCheckLocation(location.id);
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
            check={{
              checked: isTicked(item.id),
              onChange: (on) =>
                setTicked(on ? [...ticked, item.id] : ticked.filter((other) => other !== item.id)),
            }}
          />
        ))}
      </ListSection>
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
