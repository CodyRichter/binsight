import { Button, SegmentedControl } from "@mantine/core";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { AddBar } from "@/components/AddBar";
import { AppFrame } from "@/components/AppFrame";
import { EmptyState } from "@/components/EmptyState";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { ItemsSection, useAddItem, useLocationItems } from "@/features/items";
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
}

function LocationBody({ location, locations }: LocationBodyProps) {
  const [scope, setScope] = useState("here");
  const [addingLocation, setAddingLocation] = useState(false);
  const everythingInside = scope === "inside";
  const children = childrenOf(locations, location.id);
  const items = useLocationItems(location.id, everythingInside);
  const addItem = useAddItem(location, useRefreshLocationTree());
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
          />
        }
      >
        <AddBar onAdd={(names) => names.forEach(addItem)} />
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

export function LocationContents() {
  const { id } = useParams();
  const tree = useLocationTree();
  const location = tree.data?.find((candidate) => candidate.id === id);
  const status = pageStatusOf(tree);
  const parent = location?.parent_id ? `/locations/${location.parent_id}` : "/";
  return (
    <AppFrame current="home" parent={parent}>
      <PageState
        status={status === "ready" && !location ? "notFound" : status}
        standalone
        notFound={nothingHere}
        onRetry={() => void tree.refetch()}
      >
        {location && tree.data && (
          <LocationBody key={location.id} location={location} locations={tree.data} />
        )}
      </PageState>
    </AppFrame>
  );
}
