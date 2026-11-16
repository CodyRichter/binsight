import { useState, type ReactElement } from "react";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { PageHeader } from "@/components/PageHeader";
import { DesignFrame } from "./DesignFrame";
import {
  childrenOf,
  countWords,
  itemsInside,
  locationUrl,
  sampleItems,
  type SampleLocation,
} from "./sampleHome";

function treeRows(
  locations: SampleLocation[],
  depth: number,
  open: Set<string>,
  toggle: (id: string) => void,
): ReactElement[] {
  return locations.flatMap((location) => {
    const children = childrenOf(location.id);
    const expanded = open.has(location.id);
    const row = (
      <LocationRow
        key={location.id}
        name={location.name}
        code={location.code}
        locationType={location.locationType}
        itemCount={itemsInside(location.id).length}
        to={locationUrl(location.id)}
        tree
        depth={depth}
        expanded={children.length > 0 ? expanded : undefined}
        onToggle={children.length > 0 ? () => toggle(location.id) : undefined}
      />
    );
    return expanded ? [row, ...treeRows(children, depth + 1, open, toggle)] : [row];
  });
}

export function LocationsSpecimen() {
  const [open, setOpen] = useState(new Set(["home", "garage"]));
  const sites = childrenOf(undefined);
  const toggle = (id: string) => {
    const next = new Set(open);
    if (!next.delete(id)) next.add(id);
    setOpen(next);
  };
  return (
    <DesignFrame destination>
      <PageHeader
        title="Locations"
        counts={[countWords(sites.length, "site"), countWords(sampleItems.length, "item")]}
      />
      <ListSection>{treeRows(sites, 0, open, toggle)}</ListSection>
    </DesignFrame>
  );
}
