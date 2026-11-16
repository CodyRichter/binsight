import { useState } from "react";
import { useNavigate } from "react-router";
import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { TaskFrame } from "@/components/TaskFrame";
import { showToast } from "@/lib/toast";
import { itemUrl, locationUrl, sampleItems } from "./sampleHome";

export function TaskSpecimen() {
  const navigate = useNavigate();
  const [ticked, setTicked] = useState<string[]>([]);
  const items = sampleItems.filter((item) => item.home === "cables");
  const done = () => {
    showToast({ message: "Contents checked", onUndo: () => undefined });
    navigate(locationUrl("cables"));
  };
  return (
    <TaskFrame
      name="Check Cables"
      onClose={() => navigate(locationUrl("cables"))}
      action={{ label: "Contents checked", onClick: done }}
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
    </TaskFrame>
  );
}
