import { useQuery } from "@tanstack/react-query";
import type { components } from "@/types/api.generated";
import { api } from "./client";

type Health = components["schemas"]["Health"];

/** Asks whether the home server is answering. */
export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.get<Health>("/api/health", signal),
  });
}
