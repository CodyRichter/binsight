import { Button } from "@mantine/core";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { SortableList } from "@/components/SortableList";
import { useReorderLocation } from "./useLocationChanges";
import type { Location } from "./useLocations";

interface ChildLocationsProps {
  locations: Location[];
  onAddLocation: () => void;
}

export function ChildLocations({ locations, onAddLocation }: ChildLocationsProps) {
  const reorder = useReorderLocation();
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
      <SortableList rows={locations} onMove={reorder}>
        {(location, sortable) => (
          <LocationRow
            name={location.name}
            locationType={location.type}
            locationIcon={location.icon}
            code={location.label_code ?? undefined}
            itemCount={location.item_count}
            to={`/locations/${location.id}`}
            sortable={sortable}
          />
        )}
      </SortableList>
    </ListSection>
  );
}
