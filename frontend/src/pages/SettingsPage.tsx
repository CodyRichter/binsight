import { AppFrame } from "@/components/AppFrame";
import { PageHeader } from "@/components/PageHeader";
import { McpCredentialsSection, SignInSection } from "@/features/auth";
import { BackupsSection } from "@/features/backups";
import { ExportImportSection } from "@/features/import-export";

export function SettingsPage() {
  return (
    <AppFrame current="settings" destination>
      <PageHeader title="Settings" />
      <McpCredentialsSection />
      <ExportImportSection />
      <BackupsSection />
      <SignInSection />
    </AppFrame>
  );
}
