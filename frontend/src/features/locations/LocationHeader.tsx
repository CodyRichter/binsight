import { Button } from "@mantine/core";
import { IconArrowsMove } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { OwnItemSheet, pathSegments, useMakeOwnItem } from "@/features/items";
import { countWords } from "./countWords";
import { LabelSheet } from "./LabelSheet";
import { moreMenu, type LocationMenuProps } from "./locationMenu";
import { MoveSheet } from "./MoveSheet";
import { PhotoAndIconSheet } from "./PhotoAndIconSheet";
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
  const [choosingPicture, setChoosingPicture] = useState(false);
  const [showingLabel, setShowingLabel] = useState(false);
  const [choosingOwnItem, setChoosingOwnItem] = useState(false);
  const makeOwnItem = useMakeOwnItem(location.id);
  const move = useMoveLocation(location);
  const change = useChangeLocation(location);
  const setPhoto = useLocationPhoto(location);
  const removing = useRemoval(props);
  // A site is the top of its tree, so it has nowhere to move to.
  const movable = location.parent_id !== null;
  return (
    <>
      <PageHeader
        title={location.name}
        onRename={(name) => change({ name })}
        parents={pathSegments(location.path.slice(0, -1))}
        code={location.id}
        onCodeClick={() => setShowingLabel(true)}
        thumbnail={{
          photoUrl: location.photo_url ?? undefined,
          locationType: location.type,
          locationIcon: location.icon,
          action: { label: "Change photo and icon", onClick: () => setChoosingPicture(true) },
        }}
        summary={{ value: location.summary ?? "", onSave: (summary) => change({ summary }) }}
        counts={[countWords(location.item_count, "item")]}
        actions={
          movable ? (
            <Button leftSection={<IconArrowsMove aria-hidden />} onClick={() => setMoving(true)}>
              Move
            </Button>
          ) : (
            onAddLocation && <Button onClick={onAddLocation}>Add location</Button>
          )
        }
        menu={moreMenu(props, movable, {
          onPicture: () => setChoosingPicture(true),
          own: { onTrack: makeOwnItem, onUseExisting: () => setChoosingOwnItem(true) },
          removal: removing.choices,
        })}
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
      <LabelSheet code={location.id} opened={showingLabel} onClose={() => setShowingLabel(false)} />
      <PhotoAndIconSheet
        opened={choosingPicture}
        location={location}
        onPick={change}
        onPhoto={setPhoto}
        onClose={() => setChoosingPicture(false)}
      />
      <OwnItemSheet
        opened={choosingOwnItem}
        locationId={location.id}
        onClose={() => setChoosingOwnItem(false)}
      />
      <RemovalSheet
        location={location}
        removal={removing.removal}
        opened={removing.choosing}
        onClose={removing.close}
      />
    </>
  );
}
