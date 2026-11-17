import { AppFrame } from "@/components/AppFrame";
import { PageHeader } from "@/components/PageHeader";
import { SignInSection } from "@/features/auth";

export function SettingsPage() {
  return (
    <AppFrame current="settings" destination>
      <PageHeader title="Settings" />
      <SignInSection />
    </AppFrame>
  );
}
