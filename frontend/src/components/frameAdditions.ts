import { createContext, type ComponentType } from "react";
import type { components } from "@/types/api.generated";
import type { NavSection } from "./navigation";

type Location = components["schemas"]["Location"];

export interface AddSheetProps {
  opened: boolean;
  onClose: () => void;
  /** The location whose page is showing, where adding starts; the inbox when left out. */
  locationId?: string;
  /** The name the add bar starts with, such as a search that found nothing. */
  name?: string;
}

export interface MoveSheetProps {
  opened: boolean;
  onClose: () => void;
  /** Where the thing is now, which is left out of the choices; null for the inbox. */
  currentId: string | null;
  /** A location being moved: it and everything inside it are left out too. */
  movingId?: string;
  /** The sheet's title; "Move to" when left out. */
  title?: string;
  /** Offers where the thing is now first, as "Where it was", for an item found again. */
  offerCurrent?: boolean;
  onPick: (place: Location) => void;
}

/** What the app's features add to every frame: the sheets, the location pane, and the navigation's counts. */
export interface FrameAdditions {
  AddSheet?: ComponentType<AddSheetProps>;
  MoveSheet?: ComponentType<MoveSheetProps>;
  /** The location tree beside a page on a wide screen, with the location given lit. */
  LocationPane?: ComponentType<{ current: string }>;
  useInboxCount: () => number | undefined;
  /** The navigation's Views section, given the view showing and whether /views is. */
  useViewsSection: (currentView: string | undefined, onViews: boolean) => NavSection | undefined;
}

// The frame lives in components, which cannot reach features, so routes.tsx provides these.
export const FrameAdditionsContext = createContext<FrameAdditions>({
  useInboxCount: () => undefined,
  useViewsSection: () => undefined,
});
