import { Button, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/Sheet";
import { NewPasswordFields } from "./NewPasswordFields";
import { useChangeOwnPassword } from "./useAccounts";

interface ChangePasswordSheetProps {
  opened: boolean;
  onClose: () => void;
}

export function ChangePasswordSheet({ opened, onClose }: ChangePasswordSheetProps) {
  const change = useChangeOwnPassword();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  function close() {
    setCurrent("");
    setPassword(null);
    setChecked(false);
    change.reset();
    onClose();
  }

  function changeNow(event: FormEvent) {
    event.preventDefault();
    setChecked(true);
    if (password === null || change.isPending) return;
    change.mutate({ current_password: current, new_password: password }, { onSuccess: close });
  }

  return (
    <Sheet opened={opened} title="Change password" onClose={close} onSubmit={changeNow}>
      <TextInput
        label="Current password"
        type="password"
        autoComplete="current-password"
        data-autofocus
        value={current}
        onChange={(event) => {
          setCurrent(event.currentTarget.value);
          change.reset();
        }}
        error={change.error?.message}
      />
      <NewPasswordFields
        label="New password"
        checked={checked}
        onChange={(chosen) => {
          setPassword(chosen);
          setChecked(false);
        }}
      />
      <Button type="submit" variant="primary">
        Change password
      </Button>
    </Sheet>
  );
}
