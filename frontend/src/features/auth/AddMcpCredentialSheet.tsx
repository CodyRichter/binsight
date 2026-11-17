import { Button, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/Sheet";
import { ApiError } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { McpCredentialCommand } from "./McpCredentialCommand";
import { useCreateMcpCredential } from "./useMcpCredentials";

interface AddMcpCredentialSheetProps {
  opened: boolean;
  onClose: () => void;
}

function refusalOf(error: Error | null): string | undefined {
  if (error instanceof ApiError && !error.isNetworkError) return error.message;
  return undefined;
}

export function AddMcpCredentialSheet({ opened, onClose }: AddMcpCredentialSheetProps) {
  const create = useCreateMcpCredential();
  const [name, setName] = useState("");
  // The secret lives only here, so closing the sheet by any route forgets it.
  const [secret, setSecret] = useState<string | null>(null);

  function close() {
    setName("");
    setSecret(null);
    create.reset();
    onClose();
  }

  function addNow() {
    if (create.isPending) return;
    create.mutate(name, {
      onSuccess: (created) => setSecret(created.secret),
      onError: (error) => {
        if (error instanceof ApiError && error.isNetworkError)
          showToast({ message: error.message, onRetry: addNow });
      },
    });
  }

  function add(event: FormEvent) {
    event.preventDefault();
    addNow();
  }

  return (
    <Sheet
      opened={opened}
      title="Add MCP credential"
      onClose={close}
      onSubmit={secret ? undefined : add}
    >
      {secret ? (
        <McpCredentialCommand secret={secret} onDone={close} />
      ) : (
        <>
          <TextInput
            label="Name"
            placeholder="Claude Code"
            data-autofocus
            value={name}
            onChange={(event) => {
              setName(event.currentTarget.value);
              create.reset();
            }}
            error={refusalOf(create.error)}
          />
          <Button type="submit" variant="primary">
            Add
          </Button>
        </>
      )}
    </Sheet>
  );
}
