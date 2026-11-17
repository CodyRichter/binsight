import { createContext, type ComponentType } from "react";

export interface AddSheetProps {
  opened: boolean;
  onClose: () => void;
  /** The location whose page is showing, where adding starts; the inbox when left out. */
  locationId?: string;
}

/** What the app's features add to every frame: the Add sheet and the inbox's count. */
export interface FrameAdditions {
  AddSheet?: ComponentType<AddSheetProps>;
  useInboxCount: () => number | undefined;
}

// The frame lives in components, which cannot reach features, so routes.tsx provides these.
export const FrameAdditionsContext = createContext<FrameAdditions>({
  useInboxCount: () => undefined,
});
