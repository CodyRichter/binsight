import {
  IconArchive,
  IconArmchair,
  IconBox,
  IconDoor,
  IconHome,
  IconLayoutRows,
  IconPackage,
  type Icon,
} from "@tabler/icons-react";

export type LocationType = "site" | "room" | "furniture" | "shelf" | "bin" | "drawer" | "box";

export const locationTypeIcons: Record<LocationType, Icon> = {
  site: IconHome,
  room: IconDoor,
  furniture: IconArmchair,
  shelf: IconLayoutRows,
  bin: IconBox,
  drawer: IconArchive,
  box: IconPackage,
};
