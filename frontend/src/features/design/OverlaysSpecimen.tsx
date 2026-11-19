import { ActionIcon, Button, Group, Menu, TextInput } from "@mantine/core";
import { IconListDetails, IconQrcode, IconScan, IconSearch, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LocationRow } from "@/components/LocationRow";
import { Sheet } from "@/components/Sheet";
import { showToast } from "@/lib/toast";
import { Specimen } from "./Specimen";

export function OverlaysSpecimen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const undoToast = () => showToast({ message: "Moved to Power tools", onUndo: () => undefined });
  const moveTo = (destination: string) => {
    setSheetOpen(false);
    showToast({ message: `Moved to ${destination}`, onUndo: () => undefined });
  };
  const refusalToast = () =>
    showToast({
      message: "Could not save. Cat6 patch cable is back in Network cables.",
      onRetry: () => undefined,
    });
  return (
    <Specimen title="Overlays and toast">
      <Group gap="sm">
        <Button onClick={() => setSheetOpen(true)}>Move</Button>
        <Button onClick={() => setDialogOpen(true)}>Revoke a credential</Button>
        <Menu position="bottom-start">
          <Menu.Target>
            <Button>Menu</Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconQrcode aria-hidden size={20} />}>Download label</Menu.Item>
            <Menu.Item leftSection={<IconListDetails aria-hidden size={20} />}>
              Contents sheet
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="danger" leftSection={<IconTrash aria-hidden size={20} />}>
              Delete location
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <Button onClick={undoToast}>Undo toast</Button>
        <Button onClick={refusalToast}>Refusal toast</Button>
      </Group>
      <Sheet
        opened={sheetOpen}
        title="Move to"
        onClose={() => setSheetOpen(false)}
        rows={
          <>
            <LocationRow
              name="Power tools"
              onPick={() => moveTo("Power tools")}
              locationType="bin"
              code="B2R-W9T"
              itemCount={9}
            />
            <LocationRow
              name="Workbench"
              onPick={() => moveTo("Workbench")}
              locationType="furniture"
              itemCount={22}
            />
          </>
        }
      >
        <TextInput
          aria-label="Search locations"
          placeholder="Search locations or scan"
          leftSection={<IconSearch aria-hidden size={20} />}
          rightSection={
            <ActionIcon aria-label="Scan destination">
              <IconScan aria-hidden />
            </ActionIcon>
          }
        />
      </Sheet>
      <ConfirmDialog
        opened={dialogOpen}
        title="Revoke Claude Desktop?"
        detail="Claude stops reaching Binsight with it."
        cancelLabel="Keep it"
        confirmLabel="Revoke"
        onCancel={() => setDialogOpen(false)}
        onConfirm={() => setDialogOpen(false)}
      />
    </Specimen>
  );
}
