import { useState } from "react";
import { useParams } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { EmptyState } from "@/components/EmptyState";
import { PageState } from "@/components/PageState";
import {
  ItemsSection,
  useItemSelection,
  useLocationItems,
  type ItemSelection,
} from "@/features/items";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useAccess } from "@/lib/api/useAccess";
import { AddLocationSheet } from "./AddLocationSheet";
import { ChildLocations } from "./ChildLocations";
import { DeletedLocation } from "./DeletedLocation";
import { LocationLead } from "./LocationLead";
import { newLocationType } from "./newLocationType";
import { parentPage } from "./parentPage";
import { childrenOf } from "./treeRows";
import { useCreateLocation, useLocationTree, type Location } from "./useLocations";

interface LocationBodyProps {
  location: Location;
  locations: Location[];
  selection: ItemSelection;
}

function LocationBody({ location, locations, selection }: LocationBodyProps) {
  const [scope, setScope] = useState("here");
  const [addingLocation, setAddingLocation] = useState(false);
  const { canEdit } = useAccess();
  const everythingInside = scope === "inside";
  const children = childrenOf(locations, location.id);
  const items = useLocationItems(location.id, everythingInside);
  const createLocation = useCreateLocation();
  const openSheet = () => setAddingLocation(true);
  const empty = children.length === 0 && items.data?.length === 0;
  return (
    <>
      <LocationLead
        location={location}
        hasChildren={children.length > 0}
        scope={scope}
        onScope={setScope}
        onAddLocation={openSheet}
      />
      {!everythingInside && children.length > 0 && (
        <ChildLocations locations={children} onAddLocation={canEdit ? openSheet : undefined} />
      )}
      <PageState status={pageStatusOf(items)} onRetry={() => void items.refetch()}>
        {empty && <EmptyState statement={`This ${location.type} is empty`} />}
        {items.data && (
          <ItemsSection items={items.data} showPath={everythingInside} select={selection.select} />
        )}
      </PageState>
      <AddLocationSheet
        opened={addingLocation}
        onAdd={(name) =>
          createLocation({ name, type: newLocationType(location), parent_id: location.id })
        }
        onClose={() => setAddingLocation(false)}
      />
    </>
  );
}

/** A location's page: its header, quick add, and what it holds. */
export function LocationView({ id }: { id: string }) {
  const tree = useLocationTree();
  const selection = useItemSelection(id, id);
  const location = tree.data?.find((candidate) => candidate.id === id);
  if (tree.data && !location) return <DeletedLocation id={id} />;
  return (
    <AppFrame
      current="home"
      parent={parentPage(location)}
      addTo={location?.id}
      selectionBar={selection.bar}
    >
      <PageState status={pageStatusOf(tree)} standalone onRetry={() => void tree.refetch()}>
        {location && tree.data && (
          <LocationBody
            key={location.id}
            location={location}
            locations={tree.data}
            selection={selection}
          />
        )}
      </PageState>
    </AppFrame>
  );
}

export function LocationContents() {
  const { id = "" } = useParams();
  return <LocationView id={id} />;
}
