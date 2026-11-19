import {
  IconArchive,
  IconArmchair,
  IconBox,
  IconDoor,
  IconHome,
  IconLayoutRows,
  IconPackage,
  createReactComponent,
  type Icon,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { fetchIconDrawing } from "@/lib/api/iconDrawing";

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

/** An icon's name in words, as a screen reader reads it: "tools-kitchen-2" is "Tools kitchen 2". */
export function iconWords(name: string): string {
  const words = name.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

async function drawnIcon(name: string): Promise<Icon> {
  const pascal = name.replace(/(^|-)(\w)/g, (_, _dash: string, letter: string) =>
    letter.toUpperCase(),
  );
  return createReactComponent("outline", name, pascal, await fetchIconDrawing(name));
}

/** A location's chosen icon once it has loaded; its type's icon until then, or for an unknown name. */
export function useLocationIcon(type: LocationType, icon: string | null | undefined): Icon {
  const { data } = useQuery({
    queryKey: ["icon", icon],
    queryFn: () => drawnIcon(icon ?? ""),
    enabled: Boolean(icon),
    staleTime: Infinity,
    retry: false,
    // A name Tabler no longer has is expected after an upgrade; the type's icon stands in.
    throwOnError: false,
  });
  return (icon && data) || locationTypeIcons[type];
}
