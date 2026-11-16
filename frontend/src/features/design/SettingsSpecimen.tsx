import { Button, Switch, Text } from "@mantine/core";
import { useState } from "react";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { ValueRow } from "@/components/ValueRow";
import { DesignFrame } from "./DesignFrame";

export function SettingsSpecimen() {
  const [backups, setBackups] = useState(true);
  return (
    <DesignFrame current="settings" destination>
      <PageHeader title="Settings" />
      <ListSection title="Labels">
        <ValueRow name="Blank labels">
          <Button>Download 12 blank labels</Button>
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
        <ValueRow name="Last backup">
          <Text size="md">2 days ago</Text>
        </ValueRow>
      </ListSection>
      <ListSection title="MCP credentials">
        <ValueRow name="Claude Desktop">
          <Button>Revoke</Button>
        </ValueRow>
      </ListSection>
    </DesignFrame>
  );
}
