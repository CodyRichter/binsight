import { Button, Menu } from "@mantine/core";
import {
  IconArrowsMove,
  IconCheck,
  IconChecklist,
  IconDownload,
  IconPhoto,
  IconPhotoOff,
  IconPlus,
} from "@tabler/icons-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCheckLocation } from "@/features/checks";
import { pathSegments } from "@/features/items";
import { labelImageAddress } from "@/lib/api/labelImageAddress";
import { countWords } from "./countWords";
import { MoveSheet } from "./MoveSheet";
import { useLocationPhoto } from "./useLocationPhoto";
import { useMoveLocation } from "./useMoveLocation";
import type { Location } from "./useLocations";

interface LocationHeaderProps {
  location: Location;
  /** Adding a location inside, when the page has no Locations section to hold that action. */
  onAddLocation?: () => void;
  onCheckMode: () => void;
}

interface PhotoChoices {
  onTakePhoto: () => void;
  onRemovePhoto: () => void;
}

function photoItems({ location }: LocationHeaderProps, photo: PhotoChoices): ReactNode {
  return (
    <>
      <Menu.Item leftSection={<IconPhoto aria-hidden size={20} />} onClick={photo.onTakePhoto}>
        {location.photo_url ? "Replace photo" : "Add photo"}
      </Menu.Item>
      {location.photo_url && (
        <Menu.Item
          leftSection={<IconPhotoOff aria-hidden size={20} />}
          onClick={photo.onRemovePhoto}
        >
          Remove photo
        </Menu.Item>
      )}
    </>
  );
}

function moreMenu(props: LocationHeaderProps, movable: boolean, photo: PhotoChoices): ReactNode {
  const code = props.location.label_code;
  return (
    <>
      {movable && props.onAddLocation && (
        <Menu.Item leftSection={<IconPlus aria-hidden size={20} />} onClick={props.onAddLocation}>
          Add location
        </Menu.Item>
      )}
      {code && (
        <Menu.Item
          component="a"
          href={labelImageAddress(code)}
          download
          leftSection={<IconDownload aria-hidden size={20} />}
        >
          Download label
        </Menu.Item>
      )}
      <Menu.Item leftSection={<IconChecklist aria-hidden size={20} />} onClick={props.onCheckMode}>
        Check mode
      </Menu.Item>
      {photoItems(props, photo)}
    </>
  );
}

export function LocationHeader(props: LocationHeaderProps) {
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
