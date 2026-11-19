import { hashKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { authStatusKey, type AuthStatus } from "@/lib/api/useAuthStatus";

export interface SignInWords {
  username: string;
  password: string;
}

function useSignedInWith(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (words: SignInWords) => api.post<AuthStatus>(path, words),
    onSuccess: (status) => {
      // What was read as a visitor left private details out, so it is read again.
      queryClient.setQueryData(authStatusKey, status);
      const statusHash = hashKey(authStatusKey);
      void queryClient.invalidateQueries({ predicate: (query) => query.queryHash !== statusHash });
    },
  });
}

/** Signs this device in with an account's username and password. */
export function useSignIn() {
  return useSignedInWith("/api/auth/sign-in");
}

/** Makes a new install's first account, an admin, which also signs this device in. */
export function useCreateFirstAdmin() {
  return useSignedInWith("/api/auth/first-admin");
}

/** Signs this device out and forgets everything read while signed in. */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<undefined>("/api/auth/sign-out"),
    onSuccess: () => {
      const status = hashKey(authStatusKey);
      queryClient.removeQueries({ predicate: (query) => query.queryHash !== status });
      queryClient.setQueryData<AuthStatus>(authStatusKey, { setup_needed: false, account: null });
    },
  });
}
