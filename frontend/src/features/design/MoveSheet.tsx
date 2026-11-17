import { LocationRow } from "@/components/LocationRow";
import { Sheet } from "@/components/Sheet";
import { itemsInside, sampleLocations, type SampleLocation } from "./sampleHome";

interface MoveSheetProps {
  opened: boolean;
  from: string;
  onPick: (destination: SampleLocation) => void;
  onClose: () => void;
}

export function MoveSheet({ opened, from, onPick, onClose }: MoveSheetProps) {
  const destinations = sampleLocations.filter((location) => location.id !== from).reverse();
  return (
    <Sheet
      opened={opened}
      title="Move to"
      onClose={onClose}
      rows={destinations.map((location) => (
        <LocationRow
          key={location.id}
          name={location.name}
          code={location.code}
          locationType={location.locationType}
          itemCount={itemsInside(location.id).length}
          onPick={() => onPick(location)}
        />
      ))}
    />
  );
}
