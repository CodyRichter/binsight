import { Button, Menu } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useParams } from "react-router";
import { EditableText } from "@/components/EditableText";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ValueRow } from "@/components/ValueRow";
import { DesignFrame } from "./DesignFrame";
import { locationUrl, pathTo, sampleItems } from "./sampleHome";

export function RecordSpecimen() {
  const { item: id } = useParams();
  const item = sampleItems.find((sample) => sample.id === id) ?? sampleItems[0];
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState("Cables");
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <DesignFrame key={item.id} parent={locationUrl(item.home)}>
      <PageLead
        header={
          <PageHeader
            title={name}
            onRename={setName}
            parents={pathTo(item.home)}
            thumbnail={{ photoUrl: item.photoUrl }}
            status={item.status === "in_place" ? undefined : { status: item.status }}
            actions={
              <>
                <Button>Move</Button>
                <Button>Mark missing</Button>
              </>
            }
            menu={
              <Menu.Item color="danger" leftSection={<IconTrash aria-hidden size={20} />}>
                Delete item
              </Menu.Item>
            }
          />
        }
      >
        <QuantityStepper value={quantity} onChange={setQuantity} />
      </PageLead>
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
    </DesignFrame>
  );
}
