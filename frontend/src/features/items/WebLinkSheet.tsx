import { Button, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/Sheet";

interface WebLinkSheetProps {
  opened: boolean;
  onAttach: (link: { url: string; name: string | null }) => void;
  onClose: () => void;
}

/** Attaching a web link by its address, with a name if one is given. */
export function WebLinkSheet({ opened, onAttach, onClose }: WebLinkSheetProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const close = () => {
    setUrl("");
    setName("");
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    onAttach({ url: url.trim(), name: name.trim() || null });
    close();
  };
  return (
    <Sheet opened={opened} title="Add link" onClose={close} onSubmit={submit}>
      <TextInput
        label="Address"
        type="url"
        data-autofocus
        value={url}
        onChange={(event) => setUrl(event.currentTarget.value)}
      />
      <TextInput
        label="Name"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <Button type="submit" variant="primary">
        Attach
      </Button>
    </Sheet>
  );
}
