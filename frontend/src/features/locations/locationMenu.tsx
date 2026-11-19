import { Menu } from "@mantine/core";
import {
  IconArrowMerge,
  IconDownload,
  IconFileText,
  IconIcons,
  IconPhoto,
  IconPhotoOff,
  IconPlus,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { labelImageAddress } from "@/lib/api/labelImageAddress";
import type { Location } from "./useLocations";

export interface LocationMenuProps {
  location: Location;
  /** Adding a location inside, when the page has no Locations section to hold that action. */
  onAddLocation?: () => void;
}

export interface RemovalChoices {
  onMerge: () => void;
  onDelete: () => void;
}

interface LookChoices {
  onTakePhoto: () => void;
  onRemovePhoto: () => void;
  onTypeAndIcon: () => void;
}

function lookItems({ location }: LocationMenuProps, look: LookChoices): ReactNode {
  return (
    <>
      <Menu.Item leftSection={<IconPhoto aria-hidden size={20} />} onClick={look.onTakePhoto}>
        {location.photo_url ? "Replace photo" : "Add photo"}
      </Menu.Item>
      {location.photo_url && (
        <Menu.Item
          leftSection={<IconPhotoOff aria-hidden size={20} />}
          onClick={look.onRemovePhoto}
        >
          Remove photo
        </Menu.Item>
      )}
      <Menu.Item leftSection={<IconIcons aria-hidden size={20} />} onClick={look.onTypeAndIcon}>
        Type and icon…
      </Menu.Item>
    </>
  );
}

function removalItems(removal: RemovalChoices): ReactNode {
  return (
    <>
      <Menu.Item leftSection={<IconArrowMerge aria-hidden size={20} />} onClick={removal.onMerge}>
        Merge into…
      </Menu.Item>
      <Menu.Item
        color="danger"
        leftSection={<IconTrash aria-hidden size={20} />}
        onClick={removal.onDelete}
      >
        Delete location
      </Menu.Item>
    </>
  );
}

/** The More menu of a location's page header. */
export function moreMenu(
  props: LocationMenuProps,
  movable: boolean,
  look: LookChoices,
  removal: RemovalChoices,
): ReactNode {
  return (
    <>
      {movable && props.onAddLocation && (
        <Menu.Item leftSection={<IconPlus aria-hidden size={20} />} onClick={props.onAddLocation}>
          Add location
        </Menu.Item>
      )}
      <Menu.Item
        component="a"
        href={labelImageAddress(props.location.id)}
        download
        leftSection={<IconDownload aria-hidden size={20} />}
      >
        Download label
      </Menu.Item>
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
      {lookItems(props, look)}
      {removalItems(removal)}
    </>
  );
}
