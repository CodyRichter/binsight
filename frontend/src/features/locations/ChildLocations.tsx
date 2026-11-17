import { Button } from "@mantine/core";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import type { Location } from "./useLocations";

interface ChildLocationsProps {
  locations: Location[];
  onAddLocation: () => void;
}

export function ChildLocations({ locations, onAddLocation }: ChildLocationsProps) {
  return (
    <ListSection
      title="Locations"
      count={locations.length}
      action={
        <Button variant="subtle" onClick={onAddLocation}>
          Add location
        </Button>
      }
    >
      {locations.map((location) => (
        <LocationRow
          key={location.id}
          name={location.name}
          locationType={location.type}
          code={location.label_code ?? undefined}
          itemCount={location.item_count}
          to={`/locations/${location.id}`}
        />
      ))}
    </ListSection>
  );
}
