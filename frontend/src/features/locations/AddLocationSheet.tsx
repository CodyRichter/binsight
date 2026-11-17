import { Button, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/Sheet";

interface AddLocationSheetProps {
  opened: boolean;
  onAdd: (name: string) => void;
  onClose: () => void;
}

export function AddLocationSheet({ opened, onAdd, onClose }: AddLocationSheetProps) {
  const [name, setName] = useState("");

  function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
    onClose();
  }

  return (
    <Sheet opened={opened} title="Add location" onClose={onClose} onSubmit={add}>
      <TextInput
        label="Name"
        data-autofocus
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <Button type="submit" variant="primary">
        Add
      </Button>
    </Sheet>
  );
}
