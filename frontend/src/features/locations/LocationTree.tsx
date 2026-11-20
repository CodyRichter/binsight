import { Button } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { PageHeader } from "@/components/PageHeader";
import { PageState } from "@/components/PageState";
import { SortableList, type SortableRowParts } from "@/components/SortableList";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { AddLocationSheet } from "./AddLocationSheet";
import { countWords } from "./countWords";
import { newLocationType } from "./newLocationType";
import { childrenOf, treeRows, type TreeRow } from "./treeRows";
import { useOpenBranches, type OpenBranches } from "./useOpenBranches";
import { useReorderLocation } from "./useLocationChanges";
import { useCreateLocation, useLocationTree, type Location } from "./useLocations";
import { useAccess } from "@/lib/api/useAccess";

interface TreeProps {
  locations: Location[];
  heading?: { title: string; action?: ReactNode };
  onPick?: (location: Location) => void;
  onAddInside?: (location: Location) => void;
  /** Sites can be put in order while every branch is closed, when the rows are just the sites. */
  onReorder?: (site: Location, index: number) => void;
  /** The location whose page is showing, lit in the tree. */
  current?: string;
  /** Branches kept open outside the tree, as the location pane's are. */
  branches?: OpenBranches;
  /** One line per row with no codes, for the narrow location pane. */
  compact?: boolean;
}

function rowTarget(location: Location, onPick?: (location: Location) => void) {
  return onPick ? { onPick: () => onPick(location) } : { to: `/locations/${location.id}` };
}

/** Every location as a tree; rows open their location, or are picked when onPick is given. */
export function Tree(props: TreeProps) {
  const { locations, heading, onPick, onAddInside, onReorder, current, compact } = props;
  const ownBranches = useOpenBranches();
  const { open, toggle } = props.branches ?? ownBranches;
  const shown = treeRows(locations, open).map((row) => ({
    ...row,
    id: row.location.id,
    name: row.location.name,
  }));
  const row = (
    { location, depth, hasChildren, expanded }: TreeRow,
    sortable?: SortableRowParts,
  ) => (
    <LocationRow
      key={location.id}
      name={location.name}
      locationType={location.type}
      locationIcon={location.icon}
      code={compact ? undefined : location.id}
      compact={compact}
      itemCount={location.item_count}
      {...rowTarget(location, onPick)}
      onAddInside={onAddInside && (() => onAddInside(location))}
      tree
      depth={depth}
      expanded={hasChildren ? expanded : undefined}
      onToggle={hasChildren ? () => toggle(location.id) : undefined}
      sortable={sortable}
      current={location.id === current}
    />
  );
  const rows =
    onReorder && open.size === 0 ? (
      <SortableList rows={shown} onMove={(site, index) => onReorder(site.location, index)}>
        {row}
      </SortableList>
    ) : (
      shown.map((each) => row(each))
    );
  return heading ? (
    <ListSection {...heading}>{rows}</ListSection>
  ) : (
    <ListSection flush={compact}>{rows}</ListSection>
  );
}

function Sites({ locations }: { locations: Location[] }) {
  const [adding, setAdding] = useState(false);
  const create = useCreateLocation();
  const reorder = useReorderLocation();
  const { canEdit } = useAccess();
  const sites = childrenOf(locations, null);
  const itemCount = sites.reduce((total, site) => total + site.item_count, 0);
  return (
    <>
      <PageHeader
        title="Locations"
        counts={[countWords(sites.length, "site"), countWords(itemCount, "item")]}
        actions={canEdit && <Button onClick={() => setAdding(true)}>Add location</Button>}
      />
      <PageState
        status={sites.length > 0 ? "ready" : "empty"}
        empty={{ statement: "No locations" }}
      >
        <Tree locations={locations} onReorder={canEdit ? reorder : undefined} />
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
