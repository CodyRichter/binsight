import { hashKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { authStatusKey, type AuthStatus } from "@/lib/api/useAuthStatus";

function useSignedInWith(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.post<AuthStatus>(path, { password }),
    onSuccess: (status) => queryClient.setQueryData(authStatusKey, status),
  });
}

/** Signs this device in with the owner's password. */
export function useSignIn() {
  return useSignedInWith("/api/auth/sign-in");
}

/** Sets the owner's password on a new install, which also signs this device in. */
export function useCreateOwner() {
  return useSignedInWith("/api/auth/owner");
}

/** Signs this device out and forgets everything read while signed in. */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<undefined>("/api/auth/sign-out"),
    onSuccess: () => {
      const status = hashKey(authStatusKey);
      queryClient.removeQueries({ predicate: (query) => query.queryHash !== status });
      // The page's session check then sends it to the Gate, which returns here after sign-in.
      queryClient.setQueryData<AuthStatus>(authStatusKey, { owner_exists: true, signed_in: false });
    },
  });
}
