import { useState } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { TaskFrame } from "@/components/TaskFrame";
import { showToast } from "@/lib/toast";
import { itemUrl, locationUrl, sampleItems } from "./sampleHome";

export function TaskSpecimen() {
  const navigate = useNavigate();
  const [ticked, setTicked] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const items = sampleItems.filter((item) => item.home === "cables");
  const missingCount = items.length - ticked.length;

  function finish(message: string) {
    setConfirmOpen(false);
    showToast({ message, onUndo: () => undefined });
    navigate(locationUrl("cables"));
  }

  return (
    <TaskFrame
      name="Check Cables"
      onClose={() => navigate(locationUrl("cables"))}
      action={{
        label: "Contents checked",
        onClick: () => {
          if (missingCount > 0) setConfirmOpen(true);
          else finish("Contents checked");
        },
      }}
    >
      <ListSection>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            name={item.name}
            to={itemUrl(item.id)}
            check={{
              checked: ticked.includes(item.id),
              onChange: (on) =>
                setTicked(on ? [...ticked, item.id] : ticked.filter((other) => other !== item.id)),
            }}
          />
        ))}
      </ListSection>
      <ConfirmDialog
        opened={confirmOpen}
        title={`Mark ${missingCount} unchecked items missing?`}
        detail="You can mark them found later if they turn up."
        cancelLabel="Keep checking"
        confirmLabel="Mark missing"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => finish(`Marked ${missingCount} items missing`)}
      />
    </TaskFrame>
  );
}
