import { Button } from "@mantine/core";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { SortableList, type SortableRowParts } from "@/components/SortableList";
import { useReorderLocation } from "./useLocationChanges";
import type { Location } from "./useLocations";

interface ChildLocationsProps {
  locations: Location[];
  /** Left out for someone who may not change locations: no Add location, no reordering. */
  onAddLocation?: () => void;
}

export function ChildLocations({ locations, onAddLocation }: ChildLocationsProps) {
  const reorder = useReorderLocation();
  return (
    <ListSection
      title="Locations"
      count={locations.length}
      action={
        onAddLocation && (
          <Button variant="subtle" onClick={onAddLocation}>
            Add location
          </Button>
        )
      }
    >
      {onAddLocation ? (
        <SortableList rows={locations} onMove={reorder}>
          {row}
        </SortableList>
      ) : (
        locations.map((location) => row(location))
      )}
    </ListSection>
  );
}

function row(location: Location, sortable?: SortableRowParts) {
  return (
    <LocationRow
      key={location.id}
      name={location.name}
      locationType={location.type}
      locationIcon={location.icon}
      code={location.id}
      itemCount={location.item_count}
      to={`/locations/${location.id}`}
      sortable={sortable}
    />
  );
}
