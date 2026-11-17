import { Button } from "@mantine/core";
import { useState } from "react";
import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { binPath, samplePhoto } from "./samples";

const checking = ["Cat6 patch cable, 2 m", "DisplayPort cable", "USB-C to HDMI adapter"];

export function ItemListDemo() {
  const [batteries, setBatteries] = useState(12);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [ticked, setTicked] = useState<string[]>(["DisplayPort cable"]);
  const toggle = (list: string[], name: string, on: boolean) =>
    on ? [...list, name] : list.filter((other) => other !== name);
  const selection = (name: string) =>
    selecting
      ? {
          selected: selected.includes(name),
          check: {
            checked: selected.includes(name),
            onChange: (on: boolean) => setSelected(toggle(selected, name, on)),
          },
        }
      : {};
  return (
    <>
      <ListSection
        title="Items"
        count={4}
        action={
          <Button variant="subtle" onClick={() => setSelecting(!selecting)}>
            {selecting ? "Done" : "Select"}
          </Button>
        }
      >
        <ItemRow
          {...selection("USB-C to HDMI adapter")}
          name="USB-C to HDMI adapter"
          to="/design"
          path={binPath}
          photoUrl={samplePhoto}
          marks={[{ start: 9, end: 13 }]}
        />
        <ItemRow
          {...selection("AA batteries")}
          name="AA batteries"
          to="/design"
          path={binPath}
          quantity={batteries}
          onQuantityChange={setBatteries}
        />
        <ItemRow
          {...selection("DisplayPort cable")}
          name="DisplayPort cable"
          to="/design"
          path={binPath}
          status="lent_out"
          lentTo="Dana"
        />
        <ItemRow
          {...selection("Multimeter")}
          name="Multimeter with a very long name that has to wrap onto a second line"
          to="/design"
          path={binPath}
          status="missing"
        />
      </ListSection>
      <ListSection title="Check mode" count={checking.length}>
        {checking.map((name) => (
          <ItemRow
            key={name}
            name={name}
            to="/design"
            check={{
              checked: ticked.includes(name),
              onChange: (on) => setTicked(toggle(ticked, name, on)),
            }}
          />
        ))}
      </ListSection>
    </>
  );
}
