import { Button, Menu } from "@mantine/core";
import {
  IconArrowsMove,
  IconCheck,
  IconChecklist,
  IconQrcode,
  IconTrash,
  IconZoomQuestion,
} from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { showToast } from "@/lib/toast";
import { binPath, daysAgo, samplePhoto, shelfPath } from "./samples";
import { Specimen } from "./Specimen";

export function HeaderSpecimen() {
  const [summary, setSummary] = useState("Spare patch cables and adapters");
  const [title, setTitle] = useState("Network cables");
  return (
    <Specimen title="Page header" fullWidth>
      <PageHeader
        title={title}
        onRename={setTitle}
        parents={shelfPath}
        code="B-014"
        summary={{ value: summary, onSave: setSummary }}
        lastChecked={daysAgo(21)}
        counts={["6 items"]}
        actions={
          <>
            <Button
              leftSection={<IconCheck aria-hidden />}
              onClick={() => showToast({ message: "Contents checked", onUndo: () => undefined })}
            >
              Contents checked
            </Button>
            <Button leftSection={<IconArrowsMove aria-hidden />}>Move</Button>
          </>
        }
        menu={
          <>
            <Menu.Item leftSection={<IconQrcode aria-hidden size={20} />}>Download label</Menu.Item>
            <Menu.Item leftSection={<IconChecklist aria-hidden size={20} />}>Check mode</Menu.Item>
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
