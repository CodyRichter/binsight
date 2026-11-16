import type { PathSegment } from "@/components/Path";
import type { Status } from "@/components/StatusBadge";
import type { LocationType } from "@/components/locationTypeIcons";
import { daysAgo, samplePhoto } from "./samples";

export interface SampleLocation {
  id: string;
  name: string;
  locationType: LocationType;
  code?: string;
  parent?: string;
  summary?: string;
  lastChecked: Date | null;
}

export interface SampleItem {
  id: string;
  name: string;
  home: string;
  quantity: number;
  status: Status;
  photoUrl?: string;
}

/** The setup every flow in docs/acceptance.md starts from. */
export const sampleLocations: SampleLocation[] = [
  { id: "home", name: "Home", locationType: "site", lastChecked: daysAgo(200) },
  { id: "garage", name: "Garage", locationType: "room", parent: "home", lastChecked: null },
  {
    id: "shelf-2",
    name: "Shelf 2",
    locationType: "shelf",
    parent: "garage",
    lastChecked: daysAgo(400),
  },
  {
    id: "cables",
    name: "Cables",
    locationType: "bin",
    code: "B-014",
    parent: "shelf-2",
    summary: "Spare cables and chargers",
    lastChecked: daysAgo(21),
  },
  {
    id: "tools",
    name: "Tools",
    locationType: "bin",
    code: "B-015",
    parent: "shelf-2",
    lastChecked: daysAgo(3),
  },
];

export const sampleItems: SampleItem[] = [
  {
    id: "hdmi-cable",
    name: "HDMI cable",
    home: "cables",
    quantity: 3,
    status: "in_place",
    photoUrl: samplePhoto,
  },
  { id: "usb-c-charger", name: "USB-C charger", home: "cables", quantity: 1, status: "in_use" },
];

export function sampleLocation(id: string): SampleLocation | undefined {
  return sampleLocations.find((location) => location.id === id);
}

export function childrenOf(id: string | undefined): SampleLocation[] {
  return sampleLocations.filter((location) => location.parent === id);
}

export function locationUrl(id: string): string {
  return `/design/browse/${id}`;
}

export function itemUrl(id: string): string {
  return `/design/record/${id}`;
}

/** How a location reads in a path or a toast: a labeled one by its type and code. */
export function placeName(location: SampleLocation): string {
  if (!location.code) return location.name;
  const typeWord = location.locationType[0].toUpperCase() + location.locationType.slice(1);
  return `${typeWord} ${location.code}`;
}

/** The chain of locations from the site down to and including this one. */
export function pathTo(id: string): PathSegment[] {
  const location = sampleLocation(id);
  if (!location) return [];
  const above = location.parent ? pathTo(location.parent) : [];
  return [...above, { name: placeName(location), to: locationUrl(location.id) }];
}

/** Every location inside this one, at any depth. */
export function descendantsOf(id: string): SampleLocation[] {
  return childrenOf(id).flatMap((child) => [child, ...descendantsOf(child.id)]);
}

export function itemsInside(id: string): SampleItem[] {
  const places = new Set([id, ...descendantsOf(id).map((location) => location.id)]);
  return sampleItems.filter((item) => places.has(item.home));
}

export function countWords(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
