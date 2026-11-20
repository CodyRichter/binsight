import { Menu } from "@mantine/core";
import {
  IconArrowMerge,
  IconArmchair,
  IconFileText,
  IconListSearch,
  IconPhoto,
  IconPlus,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
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

export interface OwnItemChoices {
  onTrack: () => void;
  onUseExisting: () => void;
}

function ownItemItems(own: OwnItemChoices): ReactNode {
  return (
    <>
      <Menu.Item leftSection={<IconArmchair aria-hidden size={20} />} onClick={own.onTrack}>
        Track as an item
      </Menu.Item>
      <Menu.Item leftSection={<IconListSearch aria-hidden size={20} />} onClick={own.onUseExisting}>
        Use an existing item…
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

function printItems({ location }: LocationMenuProps): ReactNode {
  return (
    <>
      <Menu.Item
        component={Link}
        to={`/locations/${location.id}/sheet`}
        leftSection={<IconFileText aria-hidden size={20} />}
      >
        Contents sheet
      </Menu.Item>
      <Menu.Item
        component={Link}
        to={`/locations/${location.id}/insurance`}
        leftSection={<IconShieldCheck aria-hidden size={20} />}
      >
        Insurance list
      </Menu.Item>
    </>
  );
}

/** The More menu of a location's page header: adding, print pages, its look, then removing it. */
export function moreMenu(
  props: LocationMenuProps,
  movable: boolean,
  choices: { onPicture: () => void; own: OwnItemChoices; removal: RemovalChoices },
): ReactNode {
  const { onPicture, own, removal } = choices;
  return (
    <>
      {movable && props.onAddLocation && (
        <>
          <Menu.Item leftSection={<IconPlus aria-hidden size={20} />} onClick={props.onAddLocation}>
            Add location
          </Menu.Item>
          <Menu.Divider />
        </>
      )}
      {printItems(props)}
      <Menu.Divider />
      <Menu.Item leftSection={<IconPhoto aria-hidden size={20} />} onClick={onPicture}>
        Photo and icon…
      </Menu.Item>
      <Menu.Divider />
      {props.location.own_item_id === null && (
        <>
          {ownItemItems(own)}
          <Menu.Divider />
        </>
      )}
      {removalItems(removal)}
    </>
  );
}
