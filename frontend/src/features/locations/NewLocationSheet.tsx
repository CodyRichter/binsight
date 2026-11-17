import { AddLocationSheet } from "./AddLocationSheet";
import { newLocationType } from "./newLocationType";
import { useCreateLocation, type Location } from "./useLocations";

export interface NewLocationPlace {
  parent: Location | null;
}

interface NewLocationSheetProps {
  place: NewLocationPlace | null;
  onClose: () => void;
  onCreated: (location: { id: string; name: string }) => void;
}

/** The "Add location" sheet for a new site, or a location inside a parent, handing back what it made. */
export function NewLocationSheet({ place, onClose, onCreated }: NewLocationSheetProps) {
  const create = useCreateLocation();
  const parent = place?.parent ?? undefined;
  return (
    <AddLocationSheet
      opened={place !== null}
      onAdd={(name) =>
        create({ name, type: newLocationType(parent), parent_id: parent?.id ?? null }, onCreated)
      }
      onClose={onClose}
    />
  );
}
