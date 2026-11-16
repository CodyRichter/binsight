import { Button } from "@mantine/core";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { showToast } from "@/lib/toast";
import { AddLocationSheet } from "./AddLocationSheet";
import {
  childrenOf,
  itemsInside,
  itemUrl,
  locationUrl,
  pathTo,
  type SampleItem,
  type SampleLocation,
} from "./sampleHome";

interface LocationContentsProps {
  location: SampleLocation;
  everythingInside: boolean;
  items: SampleItem[];
  selected: string[] | null;
  onSelect: (selected: string[] | null) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onMove: (id: string) => void;
}

function useAddedLocations(location: SampleLocation) {
  const [added, setAdded] = useState<SampleLocation[]>([]);
  const locationType = location.locationType === "site" ? "room" : "bin";
  const add = (name: string) => {
    const id = `${location.id}-${added.length + 1}`;
    setAdded([...added, { id, name, locationType, parent: location.id, lastChecked: null }]);
    showToast({ message: `Added ${name}`, onUndo: () => setAdded(added) });
  };
  return { locations: [...childrenOf(location.id), ...added], add };
}

export function LocationContents(props: LocationContentsProps) {
  const { location, everythingInside, items, selected, onSelect } = props;
  const [addingLocation, setAddingLocation] = useState(false);
  const children = useAddedLocations(location);
  const shown = everythingInside ? itemsInside(location.id) : items;
  const tick = (id: string, on: boolean) =>
    onSelect(on ? [...(selected ?? []), id] : (selected ?? []).filter((other) => other !== id));
  const rows = shown.map((item) => (
    <ItemRow
      key={item.id}
      name={item.name}
      to={itemUrl(item.id)}
      path={everythingInside ? pathTo(item.home) : undefined}
      photoUrl={item.photoUrl}
      status={item.status}
      quantity={selected ? 1 : item.quantity}
      onQuantityChange={(quantity) => props.onQuantityChange(item.id, quantity)}
      onMove={selected || everythingInside ? undefined : () => props.onMove(item.id)}
      selected={selected?.includes(item.id)}
      check={
        selected
          ? { checked: selected.includes(item.id), onChange: (on) => tick(item.id, on) }
          : undefined
      }
    />
  ));
  if (children.locations.length === 0 && shown.length === 0) {
    return <EmptyState statement={`This ${location.locationType} is empty`} />;
  }
  return (
    <>
      {!everythingInside && children.locations.length > 0 && (
        <ListSection
          title="Locations"
          count={children.locations.length}
          action={
            <Button variant="subtle" onClick={() => setAddingLocation(true)}>
              Add location
            </Button>
          }
        >
          {children.locations.map((child) => (
            <LocationRow
              key={child.id}
              name={child.name}
              code={child.code}
              locationType={child.locationType}
              itemCount={itemsInside(child.id).length}
              to={locationUrl(child.id)}
            />
          ))}
        </ListSection>
      )}
      {shown.length > 0 && (
        <ListSection
          title="Items"
          count={shown.length}
          action={
            !selected && (
              <Button variant="subtle" onClick={() => onSelect([])}>
                Select
              </Button>
            )
          }
        >
          {rows}
        </ListSection>
      )}
      <AddLocationSheet
        opened={addingLocation}
        onAdd={children.add}
        onClose={() => setAddingLocation(false)}
      />
    </>
  );
}
