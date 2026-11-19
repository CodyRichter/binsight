import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

export type Account = components["schemas"]["Account"];
type NewAccount = components["schemas"]["NewAccount"];
type AccountChanges = components["schemas"]["AccountChanges"];
type AccountPage = components["schemas"]["Page_Account_"];

const accountsKey = ["accounts"] as const;
const accounts = "/api/auth/accounts";

// The design has no "more" control, so every page is read before the list shows.
async function everyAccount(signal: AbortSignal) {
  const found: Account[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page: AccountPage = await api.get<AccountPage>(`${accounts}?${query}`, signal);
    found.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return found;
}

/** Every account, oldest first. */
export function useAccounts() {
  return useQuery({ queryKey: accountsKey, queryFn: ({ signal }) => everyAccount(signal) });
}

function useRefreshAccounts(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: accountsKey });
}

/** Makes an account for someone in the household. */
export function useCreateAccount() {
  const refresh = useRefreshAccounts();
  return useMutation({
    mutationFn: (account: NewAccount) => api.post<Account>(accounts, account),
    onSuccess: refresh,
  });
}

/** Changes an account's role, or sets its password, which signs it out everywhere. */
export function useUpdateAccount() {
  const refresh = useRefreshAccounts();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: AccountChanges }) =>
      api.patch<Account>(`${accounts}/${id}`, changes),
    onSuccess: refresh,
  });
}

/** Deletes an account and signs it out everywhere. */
export function useDeleteAccount() {
  const refresh = useRefreshAccounts();
  return useMutation({
    mutationFn: (id: string) => api.delete<undefined>(`${accounts}/${id}`),
    onSuccess: refresh,
  });
}

/** Sets a new password for the signed-in account, given its current one. */
export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (passwords: { current_password: string; new_password: string }) =>
      api.post<undefined>("/api/auth/password", passwords),
  });
}
