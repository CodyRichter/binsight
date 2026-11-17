import { Button, Group } from "@mantine/core";
import { Link } from "react-router";
import { Specimen } from "./Specimen";

const templates = [
  { name: "Browse", to: "/design/browse/cables" },
  { name: "Browse, the top", to: "/design/browse" },
  { name: "List", to: "/design/list?q=cable" },
  { name: "Record", to: "/design/record/hdmi-cable" },
  { name: "Task", to: "/design/task" },
];

export function TemplatesSpecimen() {
  return (
    <Specimen title="Page templates">
      <Group gap="sm">
        {templates.map((template) => (
          <Button key={template.to} component={Link} to={template.to}>
            {template.name}
          </Button>
        ))}
      </Group>
    </Specimen>
  );
}
