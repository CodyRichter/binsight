import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";
import { lentToNamesKey } from "./useItemAction";

type LentToNamePage = components["schemas"]["Page_LentToName_"];

/** The names items were lent to before, offered while lending. */
export function useLentToNames(enabled: boolean) {
  return useQuery({
    queryKey: lentToNamesKey,
    // A sheet offers names, not a full list, so the first page is enough.
    queryFn: ({ signal }) => api.get<LentToNamePage>("/api/items/lent-to-names?limit=200", signal),
    enabled,
  });
}
