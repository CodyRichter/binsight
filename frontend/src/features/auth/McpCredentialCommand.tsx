import { Button, Text, Textarea } from "@mantine/core";
import { useState } from "react";
import { claudeCodeCommand } from "./claudeCodeCommand";

interface McpCredentialCommandProps {
  secret: string;
  onDone: () => void;
}

export function McpCredentialCommand({ secret, onDone }: McpCredentialCommandProps) {
  const [copied, setCopied] = useState(false);
  const command = claudeCodeCommand(window.location.origin, secret);
  // The clipboard exists only on HTTPS or localhost; elsewhere the command is selected by hand.
  const clipboard = "clipboard" in navigator ? navigator.clipboard : null;
  return (
    <>
      <Textarea label="Command" readOnly autosize value={command} />
      {clipboard && (
        <Button onClick={() => void clipboard.writeText(command).then(() => setCopied(true))}>
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
      <Text size="sm" c="dimmed">
        The secret is not shown again.
      </Text>
      <Button variant="primary" data-autofocus onClick={onDone}>
        Done
      </Button>
    </>
  );
}
