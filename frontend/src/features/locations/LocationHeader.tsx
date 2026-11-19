import { Button } from "@mantine/core";
import { IconArrowsMove, IconCheck } from "@tabler/icons-react";
import { useRef, useState, type ChangeEvent } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCheckLocation } from "@/features/checks";
import { pathSegments } from "@/features/items";
import { countWords } from "./countWords";
import { moreMenu, type LocationMenuProps } from "./locationMenu";
import { MoveSheet } from "./MoveSheet";
import { RemovalSheet, type Removal } from "./RemovalSheet";
import { useChangeLocation } from "./useLocationChanges";
import { useLocationPhoto } from "./useLocationPhoto";
import { useDeleteLocation } from "./useLocationRemoval";
import { useMoveLocation } from "./useMoveLocation";

interface LocationHeaderProps extends LocationMenuProps {
  /** Whether locations sit inside it, so deleting it has something to move. */
  hasChildren: boolean;
}

function useRemoval(props: LocationHeaderProps) {
  const [removal, setRemoval] = useState<Removal>("merge");
  const [choosing, setChoosing] = useState(false);
  const remove = useDeleteLocation(props.location);
  const choose = (kind: Removal) => {
    setRemoval(kind);
    setChoosing(true);
  };
  // An empty location has nothing to put anywhere, so it goes at once; Undo brings it back.
  const empty = props.location.item_count === 0 && !props.hasChildren;
  const choices = {
    onMerge: () => choose("merge"),
    onDelete: () => (empty ? remove() : choose("delete")),
  };
  return { removal, choosing, close: () => setChoosing(false), choices };
}

export function LocationHeader(props: LocationHeaderProps) {
  const { location, onAddLocation } = props;
  const [moving, setMoving] = useState(false);
  const move = useMoveLocation(location);
  const change = useChangeLocation(location);
  const check = useCheckLocation(location.id);
  const setPhoto = useLocationPhoto(location);
  const removing = useRemoval(props);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoTaken = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (photo) setPhoto(photo);
  };
  const photoChoices = {
    onTakePhoto: () => photoInput.current?.click(),
    onRemovePhoto: () => setPhoto(null),
  };
  // A site is the top of its tree, so it has nowhere to move to.
  const movable = location.parent_id !== null;
  return (
    <>
      <PageHeader
        title={location.name}
        onRename={(name) => change({ name })}
        parents={pathSegments(location.path.slice(0, -1))}
        code={location.label_code ?? undefined}
        thumbnail={location.photo_url ? { photoUrl: location.photo_url } : undefined}
        summary={{ value: location.summary ?? "", onSave: (summary) => change({ summary }) }}
        lastChecked={location.last_checked_at ? new Date(location.last_checked_at) : null}
        counts={[countWords(location.item_count, "item")]}
        actions={
          <>
            <Button leftSection={<IconCheck aria-hidden />} onClick={() => check()}>
              Contents checked
            </Button>
            {movable && (
              <Button leftSection={<IconArrowsMove aria-hidden />} onClick={() => setMoving(true)}>
                Move
              </Button>
            )}
            {!movable && onAddLocation && <Button onClick={onAddLocation}>Add location</Button>}
          </>
        }
        menu={moreMenu(props, movable, photoChoices, removing.choices)}
      />
      <input
        ref={photoInput}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Location photo"
        onChange={photoTaken}
      />
      {movable && (
        <MoveSheet
          opened={moving}
          onClose={() => setMoving(false)}
          currentId={location.parent_id}
          movingId={location.id}
          onPick={move}
        />
      )}
      <RemovalSheet
        location={location}
        removal={removing.removal}
        opened={removing.choosing}
        onClose={removing.close}
      />
    </>
  );
}
