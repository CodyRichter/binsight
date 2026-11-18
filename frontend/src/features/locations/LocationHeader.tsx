import { Button } from "@mantine/core";
import { IconArrowsMove, IconCheck } from "@tabler/icons-react";
import { useRef, useState, type ChangeEvent } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCheckLocation } from "@/features/checks";
import { pathSegments } from "@/features/items";
import { countWords } from "./countWords";
import { moreMenu, type LocationMenuProps } from "./locationMenu";
import { MoveSheet } from "./MoveSheet";
import { useLocationPhoto } from "./useLocationPhoto";
import { useMoveLocation } from "./useMoveLocation";

export function LocationHeader(props: LocationMenuProps) {
  const { location, onAddLocation } = props;
  const [moving, setMoving] = useState(false);
  const move = useMoveLocation(location);
  const check = useCheckLocation(location.id);
  const setPhoto = useLocationPhoto(location);
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
        parents={pathSegments(location.path.slice(0, -1))}
        code={location.label_code ?? undefined}
        thumbnail={location.photo_url ? { photoUrl: location.photo_url } : undefined}
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
        menu={moreMenu(props, movable, photoChoices)}
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
    </>
  );
}
