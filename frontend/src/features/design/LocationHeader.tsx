import { Button, Menu } from "@mantine/core";
import { IconChecklist, IconQrcode, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { PageHeader } from "@/components/PageHeader";
import { showToast } from "@/lib/toast";
import { countWords, pathTo, type SampleLocation } from "./sampleHome";

interface LocationHeaderProps {
  location: SampleLocation;
  itemCount: number;
}

export function LocationHeader({ location, itemCount }: LocationHeaderProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(location.name);
  const [summary, setSummary] = useState(location.summary ?? "");
  const checked = () => showToast({ message: "Contents checked", onUndo: () => undefined });
  return (
    <PageHeader
      title={name}
      onRename={setName}
      parents={pathTo(location.id).slice(0, -1)}
      code={location.code}
      summary={{ value: summary, onSave: setSummary }}
      lastChecked={location.lastChecked}
      counts={[countWords(itemCount, "item")]}
      actions={
        <>
          <Button onClick={checked}>Contents checked</Button>
          <Button>Move</Button>
        </>
      }
      menu={
        <>
          <Menu.Item leftSection={<IconQrcode aria-hidden size={20} />}>Download label</Menu.Item>
          <Menu.Item
            leftSection={<IconChecklist aria-hidden size={20} />}
            onClick={() => navigate("/design/task")}
          >
            Check mode
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item color="danger" leftSection={<IconTrash aria-hidden size={20} />}>
            Delete location
          </Menu.Item>
        </>
      }
    />
  );
}
