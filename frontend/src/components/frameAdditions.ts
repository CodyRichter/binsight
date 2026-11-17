import { createContext, type ComponentType } from "react";
import type { components } from "@/types/api.generated";

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
  onPick: (place: Location) => void;
}

/** What the app's features add to every frame: the Add and Move sheets and the inbox's count. */
export interface FrameAdditions {
  AddSheet?: ComponentType<AddSheetProps>;
  MoveSheet?: ComponentType<MoveSheetProps>;
  useInboxCount: () => number | undefined;
}

// The frame lives in components, which cannot reach features, so routes.tsx provides these.
export const FrameAdditionsContext = createContext<FrameAdditions>({
  useInboxCount: () => undefined,
});
