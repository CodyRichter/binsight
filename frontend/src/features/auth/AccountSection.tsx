import { Button } from "@mantine/core";
import { useState } from "react";
import { ListSection } from "@/components/ListSection";
import { ValueRow } from "@/components/ValueRow";
import { useAccess } from "@/lib/api/useAccess";
import { showToast } from "@/lib/toast";
import { ChangePasswordSheet } from "./ChangePasswordSheet";
import { roleWord } from "./roles";
import { useSignOut } from "./useAuthActions";

/** Who this device is signed in as, with changing its password and signing out. */
export function AccountSection() {
  const { account } = useAccess();
  const signOut = useSignOut();
  const [changing, setChanging] = useState(false);
  const signOutNow = () => {
    if (signOut.isPending) return;
    signOut.mutate(undefined, {
      onError: (error) => showToast({ message: error.message, onRetry: signOutNow }),
    });
  };
  if (!account) return null;
  return (
    <ListSection title="Your account">
      <ValueRow name="Signed in as">
        {account.username} · {roleWord(account.role)}
      </ValueRow>
      <ValueRow name="Password">
        <Button onClick={() => setChanging(true)}>Change</Button>
      </ValueRow>
      <ValueRow name="This device">
        <Button onClick={signOutNow}>Sign out</Button>
      </ValueRow>
      <ChangePasswordSheet opened={changing} onClose={() => setChanging(false)} />
    </ListSection>
  );
}
