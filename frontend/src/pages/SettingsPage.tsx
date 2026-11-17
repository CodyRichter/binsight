import { AppFrame } from "@/components/AppFrame";
import { PageHeader } from "@/components/PageHeader";
import { McpCredentialsSection, SignInSection } from "@/features/auth";

export function SettingsPage() {
  return (
    <AppFrame current="settings" destination>
      <PageHeader title="Settings" />
      <McpCredentialsSection />
      <SignInSection />
    </AppFrame>
  );
}
