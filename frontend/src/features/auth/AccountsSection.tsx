import { Button } from "@mantine/core";
import { useState } from "react";
import { ChosenValue } from "@/components/ChosenValue";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ListSection } from "@/components/ListSection";
import { PageState } from "@/components/PageState";
import { ValueRow } from "@/components/ValueRow";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { showToast } from "@/lib/toast";
import { AccountSheet } from "./AccountSheet";
import { AddAccountSheet } from "./AddAccountSheet";
import { roleWord } from "./roles";
import { useAccounts, useDeleteAccount, type Account } from "./useAccounts";

/** The household's accounts, for an admin to add, change and delete. */
export function AccountsSection() {
  const accounts = useAccounts();
  const remove = useDeleteAccount();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const opened = accounts.data?.find((account) => account.id === open) ?? null;

  const deleteNow = (account: Account) => {
    setDeleting(null);
    remove.mutate(account.id, {
      onError: (error) => showToast({ message: error.message, onRetry: () => deleteNow(account) }),
    });
  };

  return (
    <PageState status={pageStatusOf(accounts)} onRetry={() => void accounts.refetch()}>
      <ListSection
        title="Accounts"
        action={
          <Button variant="subtle" onClick={() => setAdding(true)}>
            Add account
          </Button>
        }
      >
        {accounts.data?.map((account) => (
          <ValueRow key={account.id} name={account.username}>
            <ChosenValue
              value={roleWord(account.role)}
              label={`${account.username}'s role`}
              invitation=""
              onChoose={() => setOpen(account.id)}
            />
          </ValueRow>
        ))}
      </ListSection>
      <AddAccountSheet opened={adding} onClose={() => setAdding(false)} />
      <AccountSheet account={opened} onClose={() => setOpen(null)} onDelete={setDeleting} />
      <ConfirmDialog
        opened={deleting !== null}
        title={`Delete ${deleting?.username ?? ""}?`}
        detail="They are signed out everywhere. Their changes stay in history under their name."
        cancelLabel="Keep it"
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteNow(deleting)}
      />
    </PageState>
  );
}
