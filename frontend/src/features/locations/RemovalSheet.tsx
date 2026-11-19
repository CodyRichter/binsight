import { MoveSheet } from "./MoveSheet";
import { useDeleteLocation, useMergeLocation } from "./useLocationRemoval";
import type { Location } from "./useLocations";

export type Removal = "merge" | "delete";

interface RemovalSheetProps {
  location: Location;
  /** Kept while the sheet closes, so its title doesn't change on the way out. */
  removal: Removal;
  opened: boolean;
  onClose: () => void;
}

/** Choosing where a location's contents go: into the location merged into, or before deleting. */
export function RemovalSheet({ location, removal, opened, onClose }: RemovalSheetProps) {
  const merge = useMergeLocation(location);
  const remove = useDeleteLocation(location);
  return (
    <MoveSheet
      opened={opened}
      onClose={onClose}
      title={removal === "merge" ? "Merge into" : "Move contents to"}
      currentId={null}
      movingId={location.id}
      onPick={removal === "merge" ? merge : remove}
    />
  );
}
