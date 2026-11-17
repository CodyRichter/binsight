import { IconClock, IconPin, IconUser, IconZoomQuestion } from "@tabler/icons-react";
import type { PathSegment } from "@/components/Path";
import type { NavItem } from "@/components/navigation";
import samplePhoto from "./sample-photo.svg";

export { samplePhoto };

const day = 24 * 60 * 60 * 1000;

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * day);
}

export const sampleViews: NavItem[] = [
  { name: "Lent out", to: "/views/lent-out", count: 2, icon: IconUser },
  { name: "Missing", to: "/views/missing", count: 1, icon: IconZoomQuestion },
  { name: "Not checked in a long time", to: "/views/not-checked", count: 9, icon: IconClock },
  { name: "All cables", to: "/views/all-cables", count: 41, icon: IconPin },
];

export const binPath: PathSegment[] = [
  { name: "Garage", to: "/design" },
  { name: "Shelf 2", to: "/design" },
  { name: "Bin B-014", to: "/design" },
];

export const shelfPath: PathSegment[] = binPath.slice(0, 2);
