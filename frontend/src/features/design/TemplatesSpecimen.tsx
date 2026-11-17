import { Button, Group } from "@mantine/core";
import { Link } from "react-router";
import { Specimen } from "./Specimen";

const templates = [
  { name: "List", to: "/design/list?q=cable" },
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
