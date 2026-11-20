import { IconListDetails, IconPin } from "@tabler/icons-react";
import type { NavSection } from "@/components/navigation";
import { useSavedSearches } from "./useSavedSearches";
import { useViews } from "./useViews";
import { viewIcons } from "./viewWords";

/** The side navigation's Views: the views with something in them, then the pinned searches. */
export function useViewsSection(currentView: string | undefined, onViews: boolean): NavSection {
  const views = useViews(true).data ?? [];
  const pinned = (useSavedSearches(true).data ?? []).filter((search) => search.pinned);
  const entry = (
    name: string,
    to: string,
    count: number,
    icon: NavSection["items"][0]["icon"],
  ) => ({
    name,
    to,
    count,
    icon,
    current: to === currentView,
  });
  return {
    id: "views",
    title: "Views",
    to: "/views",
    icon: IconListDetails,
    current: onViews && currentView === undefined,
    items: [
      ...views
        .filter((view) => view.count > 0)
        .map((view) => entry(view.title, `/views/${view.view}`, view.count, viewIcons[view.view])),
      ...pinned.map((search) => entry(search.name, `/views/${search.id}`, search.count, IconPin)),
    ],
  };
}
