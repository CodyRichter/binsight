import type { Icon } from "@tabler/icons-react";

export type Destination = "home" | "views" | "inbox" | "settings";

export interface NavItem {
  name: string;
  to: string;
  icon: Icon;
  count?: number;
  current?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  to?: string;
  /** Shown in place of the title while the navigation is collapsed. */
  icon?: Icon;
  current?: boolean;
  items: NavItem[];
}
