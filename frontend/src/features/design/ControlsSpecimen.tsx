import {
  ActionIcon,
  Button,
  Checkbox,
  Chip,
  Group,
  SegmentedControl,
  Stack,
  Switch,
} from "@mantine/core";
import { IconArrowsMove, IconCheck, IconDotsVertical, IconScan } from "@tabler/icons-react";
import { useState } from "react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { TagList } from "@/components/TagList";
import { Specimen } from "./Specimen";

const scopes = [
  { label: "Here 6", value: "here" },
  { label: "Everything inside 37", value: "inside" },
];

export function ControlsSpecimen() {
  const [scope, setScope] = useState("here");
  const [quantity, setQuantity] = useState(12);
  const [single, setSingle] = useState(1);
  const [ticked, setTicked] = useState(true);
  const [garage, setGarage] = useState(true);
  return (
    <Specimen title="Buttons and controls" gap="xl">
      <Group gap="sm">
        <Button variant="primary" leftSection={<IconCheck aria-hidden />}>
          Contents checked
        </Button>
        <Button leftSection={<IconArrowsMove aria-hidden />}>Move</Button>
        <Button variant="subtle">Add several</Button>
        <Button variant="danger">Delete forever</Button>
        <Button disabled>Move</Button>
      </Group>
      <Group gap="sm">
        <ActionIcon aria-label="Scan">
          <IconScan aria-hidden />
        </ActionIcon>
        <ActionIcon variant="default" aria-label="More">
          <IconDotsVertical aria-hidden />
        </ActionIcon>
      </Group>
      <Stack gap={0}>
        <Checkbox
          label="Cat6 patch cable, 2 m"
          checked={ticked}
          onChange={(event) => setTicked(event.currentTarget.checked)}
        />
        <Checkbox label="DisplayPort cable" />
        <Switch label="Scheduled backups" defaultChecked />
      </Stack>
      <SegmentedControl data={scopes} value={scope} onChange={setScope} />
      <Group gap="sm">
        <Chip checked={garage} onChange={setGarage}>
          Garage
        </Chip>
        <Chip>Category</Chip>
        <Chip>Status</Chip>
      </Group>
      <TagList tags={["hdmi", "usb-c"]} tagHref={(tag) => `/design/list?q=${tag}`} />
      <Group gap="sm">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <QuantityStepper value={single} onChange={setSingle} />
      </Group>
    </Specimen>
  );
}
