import {
  IconArchive,
  IconArrowsMove,
  IconCopy,
  IconReceiptRefund,
  IconShieldCheck,
  IconSquarePlus,
  IconUser,
  IconZoomQuestion,
  type Icon,
} from "@tabler/icons-react";
import type { ViewName } from "./useViews";

export const viewIcons: Record<ViewName, Icon> = {
  "lent-out": IconUser,
  missing: IconZoomQuestion,
  "warranty-ending": IconShieldCheck,
  "return-closing": IconReceiptRefund,
  "recently-added": IconSquarePlus,
  "recently-moved": IconArrowsMove,
  "possible-duplicates": IconCopy,
  archive: IconArchive,
};

export const viewEmptyStatements: Record<ViewName, string> = {
  "lent-out": "Nothing is lent out",
  missing: "Nothing is missing",
  "warranty-ending": "No warranties end in the next 30 days",
  "return-closing": "No return windows close in the next 30 days",
  "recently-added": "Nothing added in the last 30 days",
  "recently-moved": "Nothing moved in the last 30 days",
  "possible-duplicates": "No possible duplicates",
  archive: "The archive is empty",
};

/** Whether an address's last part names a built-in view rather than a saved search. */
export function isViewName(name: string): name is ViewName {
  return name in viewIcons;
}
