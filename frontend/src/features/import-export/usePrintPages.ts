import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

export type InsuranceList = components["schemas"]["InsuranceList"];
export type InsuredItem = components["schemas"]["InsuredItem"];
export type ContentsSheet = components["schemas"]["ContentsSheet"];

/** Everything still owned in the home, or in one location and everything inside it. */
export function useInsuranceList(locationId: string | undefined) {
  const query = locationId ? `?location_id=${encodeURIComponent(locationId)}` : "";
  return useQuery({
    queryKey: ["insurance-list", locationId ?? null],
    queryFn: ({ signal }) => api.get<InsuranceList>(`/api/insurance-list${query}`, signal),
  });
}

/** A location's contents to print, grouped by the location each item is kept in. */
export function useContentsSheet(locationId: string) {
  return useQuery({
    queryKey: ["contents-sheet", locationId],
    queryFn: ({ signal }) =>
      api.get<ContentsSheet>(`/api/contents-sheet/${encodeURIComponent(locationId)}`, signal),
  });
}

/** Close goes back, or to the page that opens this one when it was opened from its address. */
export function useClosePrint(opener: string): () => void {
  const navigate = useNavigate();
  const { key } = useLocation();
  return () => (key === "default" ? navigate(opener, { replace: true }) : navigate(-1));
}
