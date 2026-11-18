import { AppFrame } from "@/components/AppFrame";
import { PageHeader } from "@/components/PageHeader";
import { McpCredentialsSection, SignInSection } from "@/features/auth";
import { BackupsSection } from "@/features/backups";
import { ExportImportSection } from "@/features/import-export";
import { LabelsSection } from "@/features/labels";

export function SettingsPage() {
  return (
    <AppFrame current="settings" destination>
      <PageHeader title="Settings" />
      <McpCredentialsSection />
      <LabelsSection />
      <ExportImportSection />
      <BackupsSection />
      <SignInSection />
    </AppFrame>
  );
}
