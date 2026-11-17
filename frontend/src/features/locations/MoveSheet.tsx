import { ActionIcon, TextInput } from "@mantine/core";
import { IconList, IconScan, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import type { MoveSheetProps } from "@/components/frameAdditions";
import { LocationRow } from "@/components/LocationRow";
import { Sheet } from "@/components/Sheet";
import { placeName } from "@/features/items";
import { Scanner } from "@/features/scan";
import { canMoveTo, moveDestinations } from "./moveDestinations";
import { recentDestinations, rememberDestination } from "./recentDestinations";
import { useLocationTree, type Location } from "./useLocations";

function scannedMessage(code: string, found: Location | undefined, currentId: string | null) {
  if (!found) return `${code} isn't on a location yet`;
  if (found.id === currentId) return `Already in ${placeName(found)}`;
  return `Can't move into ${placeName(found)}`;
}

/** Choosing where something goes: a recent place, one found by name or code, or a scanned label. */
export function MoveSheet({ opened, onClose, currentId, movingId, onPick }: MoveSheetProps) {
  // Read only while open, so a page with a closed sheet does not load the tree.
  const locations = useLocationTree(opened).data ?? [];
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string>();
  const close = () => {
    setQuery("");
    setScanning(false);
    setMessage(undefined);
    onClose();
  };
  const pick = (location: Location) => {
    rememberDestination(location.id);
    close();
    onPick(location);
  };
  const scanned = (code: string) => {
    const found = locations.find((location) => location.label_code === code);
    if (found && canMoveTo(found, currentId, movingId)) pick(found);
    else setMessage(scannedMessage(code, found, currentId));
  };
  const choices = moveDestinations(locations, {
    query,
    currentId,
    movingId,
    recent: opened ? recentDestinations() : [],
  });
  const ScanToggle = scanning ? IconList : IconScan;
  return (
    <Sheet
      opened={opened}
      title="Move to"
      onClose={close}
      rows={
        !scanning &&
        choices.map((location) => (
          <LocationRow
            key={location.id}
            name={location.name}
            locationType={location.type}
            code={location.label_code ?? undefined}
            itemCount={location.item_count}
            onPick={() => pick(location)}
          />
        ))
      }
    >
      <TextInput
        aria-label="Search locations"
        placeholder="Search locations or scan"
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setScanning(false);
        }}
        leftSection={<IconSearch aria-hidden size={20} />}
        rightSection={
          <ActionIcon
            aria-label={scanning ? "Show locations" : "Scan destination"}
            onClick={() => setScanning(!scanning)}
          >
            <ScanToggle aria-hidden />
          </ActionIcon>
        }
      />
      {scanning && <Scanner onCode={scanned} message={message} />}
    </Sheet>
  );
}
