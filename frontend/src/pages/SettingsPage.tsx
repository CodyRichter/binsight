import { AdminOnly } from "@/components/AdminOnly";
import { AppFrame } from "@/components/AppFrame";
import { PageHeader } from "@/components/PageHeader";
import { AccountSection, AccountsSection, McpCredentialsSection } from "@/features/auth";
import { BackupsSection } from "@/features/backups";
import { ExportImportSection } from "@/features/import-export";
import { LabelPrintingSection } from "@/features/labels";

export function SettingsPage() {
  return (
    <AppFrame current="settings" destination audience="signed in">
      <PageHeader title="Settings" />
      <AccountSection />
      <AdminOnly>
        <AccountsSection />
        <McpCredentialsSection />
        <LabelPrintingSection />
        <ExportImportSection />
        <BackupsSection />
      </AdminOnly>
    </AppFrame>
  );
}
