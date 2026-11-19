import { Button } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/Sheet";
import { showToast } from "@/lib/toast";
import { NewPasswordFields } from "./NewPasswordFields";
import { RoleRows } from "./RoleRows";
import type { Role } from "./roles";
import { useUpdateAccount, type Account } from "./useAccounts";

interface AccountSheetProps {
  account: Account | null;
  onClose: () => void;
  onDelete: (account: Account) => void;
}

/** One account's role, a new password for it, and deleting it. */
export function AccountSheet({ account, onClose, onDelete }: AccountSheetProps) {
  const update = useUpdateAccount();
  const [password, setPassword] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  function close() {
    setPassword(null);
    setChecked(false);
    update.reset();
    onClose();
  }

  function changeRole(chosen: Account, role: Role) {
    update.mutate(
      { id: chosen.id, changes: { role } },
      {
        onError: (error) =>
          showToast({ message: error.message, onRetry: () => changeRole(chosen, role) }),
      },
    );
  }

  function setNewPassword(event: FormEvent) {
    event.preventDefault();
    setChecked(true);
    if (!account || password === null || update.isPending) return;
    update.mutate({ id: account.id, changes: { password } }, { onSuccess: close });
  }

  return (
    <Sheet
      opened={account !== null}
      title={account?.username ?? ""}
      onClose={close}
      onSubmit={setNewPassword}
      rows={
        account && <RoleRows chosen={account.role} onPick={(role) => changeRole(account, role)} />
      }
    >
      <NewPasswordFields
        label="New password"
        checked={checked}
        error={update.error?.message}
        onChange={(chosen) => {
          setPassword(chosen);
          setChecked(false);
        }}
      />
      <Button type="submit">Set password</Button>
      <Button
        variant="danger"
        onClick={() => {
          if (!account) return;
          close();
          onDelete(account);
        }}
      >
        Delete account
      </Button>
    </Sheet>
  );
}
