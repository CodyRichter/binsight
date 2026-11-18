import { useCategories, useTags } from "@/features/items";
import type { FilterChoice } from "./FilterSheet";
import { statusWords, warrantyWords, type FilterName } from "./searchState";

type ChoiceFilter = Exclude<FilterName, "location_id">;

export const filterTitles: Record<FilterName, string> = {
  location_id: "Location",
  category: "Category",
  tag: "Tag",
  status: "Status",
  warranty: "Warranty",
};

function fixed(words: Record<string, string>): FilterChoice[] {
  return Object.entries(words).map(([value, name]) => ({ value, name }));
}

/** The values a filter offers: the categories and tags items have, or the fixed lists. */
export function useFilterChoices(filter: ChoiceFilter | null): FilterChoice[] {
  const categories = useCategories(filter === "category").data?.items ?? [];
  const tags = useTags(filter === "tag").data?.items ?? [];
  const named = (each: { name: string; item_count: number }) => ({
    value: each.name,
    name: each.name,
    itemCount: each.item_count,
  });
  if (filter === "category") return categories.map(named);
  if (filter === "tag") return tags.map(named);
  if (filter === "status") return fixed(statusWords);
  if (filter === "warranty") return fixed(warrantyWords);
  return [];
}
