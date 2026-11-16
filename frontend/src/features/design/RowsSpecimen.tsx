import { Button, Group, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { CheckedStamp } from "@/components/CheckedStamp";
import { CodeChip } from "@/components/CodeChip";
import { EmptyState } from "@/components/EmptyState";
import { Path } from "@/components/Path";
import { StatusBadge } from "@/components/StatusBadge";
import { Thumbnail } from "@/components/Thumbnail";
import { showToast } from "@/lib/toast";
import { ItemListDemo } from "./ItemListDemo";
import { LocationTreeDemo } from "./LocationTreeDemo";
import { binPath, daysAgo, samplePhoto } from "./samples";
import { Specimen } from "./Specimen";

export function RowsSpecimen() {
  return (
    <Specimen title="Rows" fullWidth>
      <Stack px="lg" gap="lg">
        <Group gap="lg">
          <Thumbnail photoUrl={samplePhoto} />
          <Thumbnail />
          <Thumbnail locationType="bin" />
          <Thumbnail photoUrl={samplePhoto} large />
          <CodeChip code="B-014" />
          <CodeChip code="B-031" blank />
        </Group>
        <Group gap="sm">
          <StatusBadge status="lent_out" lentTo="Dana" />
          <StatusBadge status="missing" />
          <StatusBadge status="in_use" />
          <StatusBadge status="sold" />
          <StatusBadge status="given_away" />
        </Group>
        <Group gap="lg">
          <CheckedStamp lastChecked={daysAgo(21)} />
          <CheckedStamp lastChecked={daysAgo(430)} />
          <CheckedStamp lastChecked={null} />
        </Group>
        <Path segments={binPath} linked />
      </Stack>
      <LocationTreeDemo />
      <ItemListDemo />
      <EmptyState
        statement='Nothing matches "multimeter"'
        action={
          <Button
            variant="primary"
            leftSection={<IconPlus aria-hidden />}
            onClick={() =>
              showToast({ message: "Added multimeter to Inbox", onUndo: () => undefined })
            }
          >
            Add &quot;multimeter&quot;
          </Button>
        }
      />
      <EmptyState statement="This bin is empty" />
    </Specimen>
  );
}
