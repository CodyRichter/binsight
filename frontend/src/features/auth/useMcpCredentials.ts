import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { components } from "@/types/api.generated";

export type McpCredential = components["schemas"]["McpCredential"];
type McpCredentialCreated = components["schemas"]["McpCredentialCreated"];
type McpCredentialPage = components["schemas"]["Page_McpCredential_"];

const mcpCredentialsKey = ["mcp-credentials"] as const;

// The design has no "more" control, so every page is read before the list shows.
async function everyCredential(signal: AbortSignal) {
  const credentials: McpCredential[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page: McpCredentialPage = await api.get<McpCredentialPage>(
      `/api/auth/mcp-credentials?${query}`,
      signal,
    );
    credentials.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return credentials;
}

/** The MCP credentials that still work, newest first. */
export function useMcpCredentials() {
  return useQuery({
    queryKey: mcpCredentialsKey,
    queryFn: ({ signal }) => everyCredential(signal),
  });
}

function useRefreshMcpCredentials(): () => void {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: mcpCredentialsKey });
}

/** Makes an MCP credential; its secret is in the answer and nowhere else. */
export function useCreateMcpCredential() {
  const refresh = useRefreshMcpCredentials();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<McpCredentialCreated>("/api/auth/mcp-credentials", { name }),
    onSuccess: refresh,
  });
}

/** Revokes an MCP credential, so Claude can no longer reach Binsight with it. */
export function useRevokeMcpCredential() {
  const refresh = useRefreshMcpCredentials();
  return useMutation({
    mutationFn: (credentialId: string) =>
      api.post<undefined>(`/api/auth/mcp-credentials/${credentialId}/revoke`),
    onSuccess: refresh,
  });
}
