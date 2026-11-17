import { Button } from "@mantine/core";
import { useState } from "react";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { PageHeader } from "@/components/PageHeader";
import { PageState } from "@/components/PageState";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { AddLocationSheet } from "./AddLocationSheet";
import { countWords } from "./countWords";
import { newLocationType } from "./newLocationType";
import { childrenOf, treeRows } from "./treeRows";
import { useCreateLocation, useLocationTree, type Location } from "./useLocations";

function useOpenBranches() {
  const [open, setOpen] = useState(new Set<string>());
  const toggle = (id: string) => {
    const next = new Set(open);
    if (!next.delete(id)) next.add(id);
    setOpen(next);
  };
  return { open, toggle };
}

interface TreeProps {
  locations: Location[];
  onPick?: (location: Location) => void;
  onAddInside?: (location: Location) => void;
}

function rowTarget(location: Location, onPick?: (location: Location) => void) {
  return onPick ? { onPick: () => onPick(location) } : { to: `/locations/${location.id}` };
}

/** Every location as a tree; rows open their location, or are picked when onPick is given. */
export function Tree({ locations, onPick, onAddInside }: TreeProps) {
  const { open, toggle } = useOpenBranches();
  return (
    <ListSection>
      {treeRows(locations, open).map(({ location, depth, hasChildren, expanded }) => (
        <LocationRow
          key={location.id}
          name={location.name}
          locationType={location.type}
          code={location.label_code ?? undefined}
          itemCount={location.item_count}
          {...rowTarget(location, onPick)}
          onAddInside={onAddInside && (() => onAddInside(location))}
          tree
          depth={depth}
          expanded={hasChildren ? expanded : undefined}
          onToggle={hasChildren ? () => toggle(location.id) : undefined}
        />
      ))}
    </ListSection>
  );
}

function Sites({ locations }: { locations: Location[] }) {
  const [adding, setAdding] = useState(false);
  const create = useCreateLocation();
  const sites = childrenOf(locations, null);
  const itemCount = sites.reduce((total, site) => total + site.item_count, 0);
  return (
    <>
      <PageHeader
        title="Locations"
        counts={[countWords(sites.length, "site"), countWords(itemCount, "item")]}
        actions={<Button onClick={() => setAdding(true)}>Add location</Button>}
      />
      <PageState
        status={sites.length > 0 ? "ready" : "empty"}
        empty={{ statement: "No locations" }}
      >
        <Tree locations={locations} />
      </PageState>
      <AddLocationSheet
        opened={adding}
        onAdd={(name) => create({ name, type: newLocationType(undefined), parent_id: null })}
        onClose={() => setAdding(false)}
      />
    </>
  );
}

export function LocationTree() {
  const tree = useLocationTree();
  return (
    <AppFrame current="home" destination>
      <PageState status={pageStatusOf(tree)} onRetry={() => void tree.refetch()}>
        {tree.data && <Sites locations={tree.data} />}
      </PageState>
    </AppFrame>
  );
}
