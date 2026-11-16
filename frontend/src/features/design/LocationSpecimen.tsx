import { Button, SegmentedControl } from "@mantine/core";
import { useState } from "react";
import { AddBar } from "@/components/AddBar";
import { PageLead } from "@/components/PageLead";
import { SelectionBar } from "@/components/SelectionBar";
import { showToast } from "@/lib/toast";
import { DesignFrame } from "./DesignFrame";
import { LocationContents } from "./LocationContents";
import { LocationHeader } from "./LocationHeader";
import { MoveSheet } from "./MoveSheet";
import {
  childrenOf,
  itemsInside,
  locationUrl,
  placeName,
  sampleItems,
  type SampleItem,
  type SampleLocation,
} from "./sampleHome";

interface LocationSpecimenProps {
  location: SampleLocation;
}

function newItem(name: string, home: string): SampleItem {
  return { id: crypto.randomUUID(), name, home, quantity: 1, status: "in_place" };
}

export function LocationSpecimen({ location }: LocationSpecimenProps) {
  const [scope, setScope] = useState("here");
  const [items, setItems] = useState(sampleItems.filter((item) => item.home === location.id));
  const [selected, setSelected] = useState<string[] | null>(null);
  const [moving, setMoving] = useState<string[] | null>(null);
  const below = itemsInside(location.id).filter((item) => item.home !== location.id);
  const scopes = [
    { label: `Here ${items.length}`, value: "here" },
    { label: `Everything inside ${items.length + below.length}`, value: "inside" },
  ];

  function remove(ids: string[], message: string) {
    setItems(items.filter((item) => !ids.includes(item.id)));
    setSelected(null);
    setMoving(null);
    showToast({ message, onUndo: () => setItems(items) });
  }

  const selectionBar = selected && (
    <SelectionBar
      count={selected.length}
      onClose={() => setSelected(null)}
      actions={
        <>
          <Button onClick={() => setMoving(selected)}>Move</Button>
          <Button onClick={() => remove(selected, `Deleted ${selected.length}`)}>Delete</Button>
        </>
      }
    />
  );
  return (
    <DesignFrame
      parent={location.parent ? locationUrl(location.parent) : "/design/browse"}
      selectionBar={selectionBar}
    >
      <PageLead
        header={<LocationHeader location={location} itemCount={items.length + below.length} />}
      >
        <AddBar
          destinationCode={location.code}
          destinationName={location.code ? undefined : location.name}
          onChangeDestination={() => undefined}
          onAdd={(names) =>
            setItems([...items, ...names.map((name) => newItem(name, location.id))])
          }
          onAddByPhoto={(photo) => setItems([...items, newItem(photo.name, location.id)])}
        />
        {childrenOf(location.id).length > 0 && (
          <SegmentedControl data={scopes} value={scope} onChange={setScope} />
        )}
      </PageLead>
      <LocationContents
        location={location}
        everythingInside={scope === "inside"}
        items={items}
        selected={selected}
        onSelect={setSelected}
        onQuantityChange={(id, quantity) =>
          setItems(items.map((item) => (item.id === id ? { ...item, quantity } : item)))
        }
        onMove={(id) => setMoving([id])}
      />
      <MoveSheet
        opened={moving !== null}
        from={location.id}
        onPick={(destination) => remove(moving ?? [], `Moved to ${placeName(destination)}`)}
        onClose={() => setMoving(null)}
      />
    </DesignFrame>
  );
}
