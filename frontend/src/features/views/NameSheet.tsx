import { Button, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/Sheet";

interface NameSheetProps {
  opened: boolean;
  title: string;
  /** The primary button's word: "Save" or "Rename". */
  action: string;
  initialName?: string;
  onName: (name: string) => void;
  onClose: () => void;
}

/** Naming a saved search, when it is saved or renamed. */
export function NameSheet({
  opened,
  title,
  action,
  initialName = "",
  onName,
  onClose,
}: NameSheetProps) {
  const [name, setName] = useState(initialName);
  const close = () => {
    setName(initialName);
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const typed = name.trim();
    if (!typed) return;
    close();
    onName(typed);
  };
  return (
    <Sheet opened={opened} title={title} onClose={close} onSubmit={submit}>
      <TextInput
        label="Name"
        data-autofocus
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <Button type="submit" variant="primary">
        {action}
      </Button>
    </Sheet>
  );
}
