import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

type CategoryPage = components["schemas"]["Page_Category_"];
type TagPage = components["schemas"]["Page_Tag_"];

export const categoriesKey = ["categories"] as const;
export const tagsKey = ["tags"] as const;

/** The categories items have, offered while a category is picked. */
export function useCategories(enabled: boolean) {
  return useQuery({
    queryKey: categoriesKey,
    // A sheet offers names, not a full list, so the first page is enough.
    queryFn: ({ signal }) => api.get<CategoryPage>("/api/categories?limit=200", signal),
    enabled,
  });
}

/** The tags items have, offered while a tag is added. */
export function useTags(enabled: boolean) {
  return useQuery({
    queryKey: tagsKey,
    queryFn: ({ signal }) => api.get<TagPage>("/api/tags?limit=200", signal),
    enabled,
  });
}
