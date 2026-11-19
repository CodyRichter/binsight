import { IconCash, IconGift, IconTrashX } from "@tabler/icons-react";
import type { SettableStatus } from "./useStatusChange";

/** The statuses that retire an item to the archive, as menus offer them. */
export const retiring: { status: SettableStatus; words: string; Icon: typeof IconCash }[] = [
  { status: "sold", words: "Sold", Icon: IconCash },
  { status: "given_away", words: "Given away", Icon: IconGift },
  { status: "thrown_away", words: "Thrown away", Icon: IconTrashX },
];
