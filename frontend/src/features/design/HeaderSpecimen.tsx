import { Button, Menu } from "@mantine/core";
import { IconArrowsMove, IconQrcode, IconTrash, IconZoomQuestion } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { QuantityStepper } from "@/components/QuantityStepper";
import { showToast } from "@/lib/toast";
import { binPath, samplePhoto, shelfPath } from "./samples";
import { Specimen } from "./Specimen";

export function HeaderSpecimen() {
  const [summary, setSummary] = useState("Spare patch cables and adapters");
  const [title, setTitle] = useState("Network cables");
  const [quantity, setQuantity] = useState(2);
  return (
    <Specimen title="Page header" fullWidth>
      <PageHeader
        title={title}
        onRename={setTitle}
        parents={shelfPath}
        code="K7Q-4MZ"
        summary={{ value: summary, onSave: setSummary }}
        counts={["6 items"]}
        actions={
          <>
            <Button
              leftSection={<IconArrowsMove aria-hidden />}
              onClick={() => showToast({ message: "Moved to Garage", onUndo: () => undefined })}
            >
              Move
            </Button>
          </>
        }
        menu={
          <>
            <Menu.Item leftSection={<IconQrcode aria-hidden size={20} />}>Download label</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="danger" leftSection={<IconTrash aria-hidden size={20} />}>
              Delete location
            </Menu.Item>
          </>
        }
      />
      <PageHeader
        title="DisplayPort cable"
        parents={binPath}
        thumbnail={{ photoUrl: samplePhoto }}
        quantity={<QuantityStepper value={quantity} onChange={setQuantity} />}
        actions={
          <>
            <Button leftSection={<IconArrowsMove aria-hidden />}>Move</Button>
            <Button leftSection={<IconZoomQuestion aria-hidden />}>Mark missing</Button>
          </>
        }
      />
      <PageHeader title="Locations" counts={["3 sites", "412 items"]} />
    </Specimen>
  );
}
