import { useQuery } from "@tanstack/react-query";
import type { components } from "@/types/api.generated";
import { api } from "./client";

export type AuthStatus = components["schemas"]["AuthStatus"];

export const authStatusKey = ["auth", "status"] as const;

export const authStatusQuery = {
  queryKey: authStatusKey,
  queryFn: ({ signal }: { signal: AbortSignal }) => api.get<AuthStatus>("/api/auth/status", signal),
};

/** Asks whether the install still needs its first admin, and who this device is signed in as. */
export function useAuthStatus() {
  return useQuery(authStatusQuery);
}
