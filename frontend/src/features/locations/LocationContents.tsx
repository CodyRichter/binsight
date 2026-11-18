import { Button, SegmentedControl } from "@mantine/core";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { EmptyState } from "@/components/EmptyState";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { CheckMode } from "@/features/checks";
import { ItemAdder, ItemsSection, useLocationItems } from "@/features/items";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { AddLocationSheet } from "./AddLocationSheet";
import { ChildLocations } from "./ChildLocations";
import { LocationHeader } from "./LocationHeader";
import { newLocationType } from "./newLocationType";
import { childrenOf } from "./treeRows";
import {
  useCreateLocation,
  useLocationTree,
  useRefreshLocationTree,
  type Location,
} from "./useLocations";

interface LocationBodyProps {
  location: Location;
  locations: Location[];
  onCheckMode: () => void;
}

function LocationBody({ location, locations, onCheckMode }: LocationBodyProps) {
  const [scope, setScope] = useState("here");
  const [addingLocation, setAddingLocation] = useState(false);
  const everythingInside = scope === "inside";
  const children = childrenOf(locations, location.id);
  const items = useLocationItems(location.id, everythingInside);
  const refreshTree = useRefreshLocationTree();
  const createLocation = useCreateLocation();
  const scopes = [
    { label: `Here ${location.direct_item_count}`, value: "here" },
    { label: `Everything inside ${location.item_count}`, value: "inside" },
  ];
  const openSheet = () => setAddingLocation(true);
  const empty = children.length === 0 && items.data?.length === 0;
  return (
    <>
      <PageLead
        header={
          <LocationHeader
            location={location}
            onAddLocation={children.length === 0 ? openSheet : undefined}
            onCheckMode={onCheckMode}
          />
        }
      >
        <ItemAdder home={location} onSettled={refreshTree} />
        {children.length > 0 && (
          <SegmentedControl data={scopes} value={scope} onChange={setScope} />
        )}
      </PageLead>
      {!everythingInside && children.length > 0 && (
        <ChildLocations locations={children} onAddLocation={openSheet} />
      )}
      <PageState status={pageStatusOf(items)} onRetry={() => void items.refetch()}>
        {empty && <EmptyState statement={`This ${location.type} is empty`} />}
        {items.data && <ItemsSection items={items.data} showPath={everythingInside} />}
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

const nothingHere = {
  statement: "Nothing at this address",
  action: (
    <Button component={Link} to="/">
      Show all locations
    </Button>
  ),
};

function frameStatus(tree: ReturnType<typeof useLocationTree>, location?: Location) {
  const status = pageStatusOf(tree);
  return status === "ready" && !location ? "notFound" : status;
}

/** A location's page: its header, quick add, and what it holds; or check mode over it. */
export function LocationView({ id }: { id: string }) {
  const tree = useLocationTree();
  const refreshTree = useRefreshLocationTree();
  const [checking, setChecking] = useState(false);
  const location = tree.data?.find((candidate) => candidate.id === id);
  if (checking && location) {
    return (
      <CheckMode location={location} onClose={() => setChecking(false)} onAdded={refreshTree} />
    );
  }
  const parent = location?.parent_id ? `/locations/${location.parent_id}` : "/";
  return (
    <AppFrame current="home" parent={parent} addTo={location?.id}>
      <PageState
        status={frameStatus(tree, location)}
        standalone
        notFound={nothingHere}
        onRetry={() => void tree.refetch()}
      >
        {location && tree.data && (
          <LocationBody
            key={location.id}
            location={location}
            locations={tree.data}
            onCheckMode={() => setChecking(true)}
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
