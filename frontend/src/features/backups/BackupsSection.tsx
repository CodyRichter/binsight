import { Button } from "@mantine/core";
import { ListSection } from "@/components/ListSection";
import { PageState } from "@/components/PageState";
import { ValueRow } from "@/components/ValueRow";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { sizeText, takenText } from "./backupWords";
import { useBackUpNow, useBackups } from "./useBackups";

/** The Settings section listing the backups kept on the home server, with "Back up now". */
export function BackupsSection() {
  const backups = useBackups();
  const backUpNow = useBackUpNow();
  return (
    <PageState status={pageStatusOf(backups)} onRetry={() => void backups.refetch()}>
      <ListSection
        title="Backups"
        action={
          <Button variant="subtle" onClick={backUpNow}>
            Back up now
          </Button>
        }
      >
        {backups.data?.backups.map((backup) => (
          <ValueRow key={backup.name} name={takenText(backup.taken_at)}>
            {sizeText(backup.size)}
          </ValueRow>
        ))}
      </ListSection>
    </PageState>
  );
}
