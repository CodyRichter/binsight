import { Button } from "@mantine/core";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ListSection } from "@/components/ListSection";
import { PageState } from "@/components/PageState";
import { ValueRow } from "@/components/ValueRow";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { showToast } from "@/lib/toast";
import { AddMcpCredentialSheet } from "./AddMcpCredentialSheet";
import { useMcpCredentials, useRevokeMcpCredential, type McpCredential } from "./useMcpCredentials";

export function McpCredentialsSection() {
  const credentials = useMcpCredentials();
  const revoke = useRevokeMcpCredential();
  const [adding, setAdding] = useState(false);
  const [revoking, setRevoking] = useState<McpCredential | null>(null);

  const revokeNow = (credential: McpCredential) => {
    setRevoking(null);
    revoke.mutate(credential.id, {
      onError: (error) =>
        showToast({ message: error.message, onRetry: () => revokeNow(credential) }),
    });
  };

  return (
    <PageState status={pageStatusOf(credentials)} onRetry={() => void credentials.refetch()}>
      <ListSection
        title="MCP credentials"
        action={
          <Button variant="subtle" onClick={() => setAdding(true)}>
            Add MCP credential
          </Button>
        }
      >
        {credentials.data?.map((credential) => (
          <ValueRow key={credential.id} name={credential.name}>
            <Button onClick={() => setRevoking(credential)}>Revoke</Button>
          </ValueRow>
        ))}
      </ListSection>
      <AddMcpCredentialSheet opened={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog
        opened={revoking !== null}
        title={`Revoke ${revoking?.name ?? ""}?`}
        detail="Claude stops reaching Binsight with it."
        cancelLabel="Keep it"
        confirmLabel="Revoke"
        onCancel={() => setRevoking(null)}
        onConfirm={() => revoking && revokeNow(revoking)}
      />
    </PageState>
  );
}
