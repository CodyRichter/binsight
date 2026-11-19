import { Button } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/Sheet";
import { NewPasswordFields } from "./NewPasswordFields";
import { RoleRows } from "./RoleRows";
import type { Role } from "./roles";
import { useCreateAccount } from "./useAccounts";
import { UsernameField } from "./UsernameField";

interface AddAccountSheetProps {
  opened: boolean;
  onClose: () => void;
}

export function AddAccountSheet({ opened, onClose }: AddAccountSheetProps) {
  const create = useCreateAccount();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("viewer");
  const [checked, setChecked] = useState(false);

  function close() {
    setUsername("");
    setPassword(null);
    setRole("viewer");
    setChecked(false);
    create.reset();
    onClose();
  }

  function add(event: FormEvent) {
    event.preventDefault();
    setChecked(true);
    if (password === null || create.isPending) return;
    create.mutate({ username, password, role }, { onSuccess: close });
  }

  return (
    <Sheet opened={opened} title="Add account" onClose={close} onSubmit={add}>
      <UsernameField
        value={username}
        onChange={(typed) => {
          setUsername(typed);
          create.reset();
        }}
      />
      <NewPasswordFields
        checked={checked}
        error={create.error?.message}
        onChange={(chosen) => {
          setPassword(chosen);
          setChecked(false);
        }}
      />
      <RoleRows chosen={role} onPick={setRole} />
      <Button type="submit" variant="primary">
        Add
      </Button>
    </Sheet>
  );
}
