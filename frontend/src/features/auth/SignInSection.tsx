import { Button } from "@mantine/core";
import { ListSection } from "@/components/ListSection";
import { ValueRow } from "@/components/ValueRow";
import { showToast } from "@/lib/toast";
import { useSignOut } from "./useAuthActions";

export function SignInSection() {
  const signOut = useSignOut();
  const signOutNow = () => {
    if (signOut.isPending) return;
    signOut.mutate(undefined, {
      onError: (error) => showToast({ message: error.message, onRetry: signOutNow }),
    });
  };
  return (
    <ListSection title="Sign-in">
      <ValueRow name="This device">
        <Button onClick={signOutNow}>Sign out</Button>
      </ValueRow>
    </ListSection>
  );
}
