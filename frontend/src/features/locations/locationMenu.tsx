import { Menu } from "@mantine/core";
import {
  IconChecklist,
  IconDownload,
  IconFileText,
  IconPhoto,
  IconPhotoOff,
  IconPlus,
  IconShieldCheck,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { labelImageAddress } from "@/lib/api/labelImageAddress";
import type { Location } from "./useLocations";

export interface LocationMenuProps {
  location: Location;
  /** Adding a location inside, when the page has no Locations section to hold that action. */
  onAddLocation?: () => void;
  onCheckMode: () => void;
}

interface PhotoChoices {
  onTakePhoto: () => void;
  onRemovePhoto: () => void;
}

function photoItems({ location }: LocationMenuProps, photo: PhotoChoices): ReactNode {
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

/** The More menu of a location's page header. */
export function moreMenu(
  props: LocationMenuProps,
  movable: boolean,
  photo: PhotoChoices,
): ReactNode {
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
      <Menu.Item
        component={Link}
        to={`/locations/${props.location.id}/sheet`}
        leftSection={<IconFileText aria-hidden size={20} />}
      >
        Contents sheet
      </Menu.Item>
      <Menu.Item
        component={Link}
        to={`/locations/${props.location.id}/insurance`}
        leftSection={<IconShieldCheck aria-hidden size={20} />}
      >
        Insurance list
      </Menu.Item>
      <Menu.Item leftSection={<IconChecklist aria-hidden size={20} />} onClick={props.onCheckMode}>
        Check mode
      </Menu.Item>
      {photoItems(props, photo)}
    </>
  );
}
