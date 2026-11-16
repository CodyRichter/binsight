import { Switch } from "@mantine/core";
import { useState } from "react";
import { EditableText } from "@/components/EditableText";
import { ListSection } from "@/components/ListSection";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ValueRow } from "@/components/ValueRow";
import { Specimen } from "./Specimen";

export function ValuesSpecimen() {
  const [category, setCategory] = useState("Cables");
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState("Bought with the dock.\nThe short one is in the car.");
  const [quantity, setQuantity] = useState(1);
  const [backups, setBackups] = useState(true);
  return (
    <Specimen title="Value rows" fullWidth>
      <ListSection title="Details">
        <ValueRow name="Category">
          <EditableText value={category} label="Category" onSave={setCategory} />
        </ValueRow>
        <ValueRow name="Serial number">
          <EditableText
            value={serial}
            label="Serial number"
            invitation="Add a serial number"
            onSave={setSerial}
          />
        </ValueRow>
        <ValueRow name="Quantity">
          <QuantityStepper value={quantity} onChange={setQuantity} />
        </ValueRow>
        <ValueRow name="Notes">
          <EditableText
            value={notes}
            label="Notes"
            invitation="Add notes"
            multiline
            onSave={setNotes}
          />
        </ValueRow>
      </ListSection>
      <ListSection title="Backups">
        <ValueRow name="Scheduled backups">
          <Switch
            aria-label="Scheduled backups"
            checked={backups}
            onChange={(event) => setBackups(event.currentTarget.checked)}
          />
        </ValueRow>
      </ListSection>
    </Specimen>
  );
}
