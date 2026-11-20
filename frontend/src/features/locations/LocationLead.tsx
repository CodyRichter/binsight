import { SegmentedControl } from "@mantine/core";
import { PageLead } from "@/components/PageLead";
import { ItemAdder, OwnItemCard } from "@/features/items";
import { useAccess } from "@/lib/api/useAccess";
import { LocationHeader } from "./LocationHeader";
import { LocationShownHeader } from "./LocationShownHeader";
import { useRefreshLocationTree, type Location } from "./useLocations";

interface LocationLeadProps {
  location: Location;
  hasChildren: boolean;
  scope: string;
  onScope: (scope: string) => void;
  onAddLocation: () => void;
}

/** A location's header with quick add and the Here / Everything inside choice under it. */
export function LocationLead({
  location,
  hasChildren,
  scope,
  onScope,
  onAddLocation,
}: LocationLeadProps) {
  const { canEdit } = useAccess();
  const refreshTree = useRefreshLocationTree();
  const scopes = [
    { label: `Here ${location.direct_item_count}`, value: "here" },
    { label: `Everything inside ${location.item_count}`, value: "inside" },
  ];
  const header = canEdit ? (
    <LocationHeader
      location={location}
      onAddLocation={hasChildren ? undefined : onAddLocation}
      hasChildren={hasChildren}
    />
  ) : (
    <LocationShownHeader location={location} />
  );
  return (
    <>
      <PageLead header={header}>
        {(canEdit || hasChildren) && (
          <>
            {canEdit && <ItemAdder home={location} onSettled={refreshTree} />}
            {hasChildren && <SegmentedControl data={scopes} value={scope} onChange={onScope} />}
          </>
        )}
      </PageLead>
      {location.own_item_id && <OwnItemCard itemId={location.own_item_id} />}
    </>
  );
}
