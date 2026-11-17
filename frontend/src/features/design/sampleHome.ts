import type { PathSegment } from "@/components/Path";
import type { Status } from "@/components/StatusBadge";
import type { LocationType } from "@/components/locationTypeIcons";
import { samplePhoto } from "./samples";

export interface SampleLocation {
  id: string;
  name: string;
  locationType: LocationType;
  code?: string;
  parent?: string;
}

export interface SampleItem {
  id: string;
  name: string;
  home: string;
  status: Status;
  photoUrl?: string;
}

/** The setup every flow in docs/acceptance.md starts from. */
export const sampleLocations: SampleLocation[] = [
  { id: "home", name: "Home", locationType: "site" },
  { id: "garage", name: "Garage", locationType: "room", parent: "home" },
  {
    id: "shelf-2",
    name: "Shelf 2",
    locationType: "shelf",
    parent: "garage",
  },
  {
    id: "cables",
    name: "Cables",
    locationType: "bin",
    code: "B-014",
    parent: "shelf-2",
  },
  {
    id: "tools",
    name: "Tools",
    locationType: "bin",
    code: "B-015",
    parent: "shelf-2",
  },
];

export const sampleItems: SampleItem[] = [
  {
    id: "hdmi-cable",
    name: "HDMI cable",
    home: "cables",
    status: "in_place",
    photoUrl: samplePhoto,
  },
  { id: "usb-c-charger", name: "USB-C charger", home: "cables", status: "in_use" },
];

function sampleLocation(id: string): SampleLocation | undefined {
  return sampleLocations.find((location) => location.id === id);
}

function childrenOf(id: string | undefined): SampleLocation[] {
  return sampleLocations.filter((location) => location.parent === id);
}

/** Where a sample row leads: the catalogue, since sample locations and items have no pages. */
export const sampleLink = "/design";

/** How a location reads in a path: a labeled one by its type and code. */
function placeName(location: SampleLocation): string {
  if (!location.code) return location.name;
  const typeWord = location.locationType[0].toUpperCase() + location.locationType.slice(1);
  return `${typeWord} ${location.code}`;
}

/** The chain of locations from the site down to and including this one. */
export function pathTo(id: string): PathSegment[] {
  const location = sampleLocation(id);
  if (!location) return [];
  const above = location.parent ? pathTo(location.parent) : [];
  return [...above, { name: placeName(location), to: sampleLink }];
}

/** Every location inside this one, at any depth. */
function descendantsOf(id: string): SampleLocation[] {
  return childrenOf(id).flatMap((child) => [child, ...descendantsOf(child.id)]);
}

export function itemsInside(id: string): SampleItem[] {
  const places = new Set([id, ...descendantsOf(id).map((location) => location.id)]);
  return sampleItems.filter((item) => places.has(item.home));
}
