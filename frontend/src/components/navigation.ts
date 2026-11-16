import type { Icon } from "@tabler/icons-react";

export type Destination = "home" | "views" | "inbox" | "settings";

export interface ViewLink {
  name: string;
  to: string;
  count: number;
  icon: Icon;
}
