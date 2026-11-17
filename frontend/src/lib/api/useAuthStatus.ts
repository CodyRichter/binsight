import { useQuery } from "@tanstack/react-query";
import type { components } from "@/types/api.generated";
import { api } from "./client";

export type AuthStatus = components["schemas"]["AuthStatus"];

export const authStatusKey = ["auth", "status"] as const;

/** Asks whether the install has an owner yet and whether this device is signed in. */
export function useAuthStatus() {
  return useQuery({
    queryKey: authStatusKey,
    queryFn: ({ signal }) => api.get<AuthStatus>("/api/auth/status", signal),
  });
}
