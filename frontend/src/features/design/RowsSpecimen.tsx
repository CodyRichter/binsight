import { Button, Group, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { CodeChip } from "@/components/CodeChip";
import { EmptyState } from "@/components/EmptyState";
import { HistoryRow } from "@/components/HistoryRow";
import { IconGrid } from "@/components/IconGrid";
import { LocationIcon } from "@/components/LocationIcon";
import { ListSection } from "@/components/ListSection";
import { NameRow } from "@/components/NameRow";
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
          <Thumbnail locationType="furniture" locationIcon="bike" />
          <Thumbnail photoUrl={samplePhoto} large />
          <CodeChip code="K7Q-4MZ" />
        </Group>
        <Group gap="sm">
          <StatusBadge status="lent_out" lentTo="Dana" />
          <StatusBadge status="missing" />
          <StatusBadge status="in_use" />
          <StatusBadge status="sold" />
          <StatusBadge status="given_away" />
        </Group>
        <Path segments={binPath} linked />
        <IconGrid
          type="furniture"
          icons={[null, "bike", "fridge", "tools-kitchen-2", "christmas-tree"]}
          chosen="bike"
          total={212}
          onPick={() => undefined}
        />
      </Stack>
      <LocationTreeDemo />
      <ItemListDemo />
      <ListSection title="History">
        <HistoryRow happened="Quantity changed from 3 to 4" at={daysAgo(0)} actor="app" />
        <HistoryRow happened="Added" at={daysAgo(21)} actor="mcp" />
      </ListSection>
      <ListSection title="Name rows">
        <NameRow name={'Make "Adapters"'} onPick={() => undefined} />
        <NameRow name="Cables" itemCount={12} onPick={() => undefined} />
        <NameRow
          name="Furniture"
          icon={<LocationIcon type="furniture" size={20} />}
          chosen
          onPick={() => undefined}
        />
      </ListSection>
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
