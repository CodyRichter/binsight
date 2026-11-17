import { Button, Group } from "@mantine/core";
import { useState } from "react";
import { CodeChip } from "@/components/CodeChip";
import { ListSection } from "@/components/ListSection";
import { PageState } from "@/components/PageState";
import { ValueRow } from "@/components/ValueRow";
import { useLocationTree } from "@/features/locations";
import { labelImageAddress } from "@/lib/api/labelImageAddress";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { MakeBlankLabelsSheet } from "./MakeBlankLabelsSheet";
import { useLabelList, type Label } from "./useLabels";

function LabelRow({ label, locationName }: { label: Label; locationName?: string }) {
  return (
    <ValueRow name={locationName ?? "Blank"}>
      <Group gap="sm">
        <CodeChip code={label.code} blank={label.location_id === null} />
        <Button component="a" href={labelImageAddress(label.code)} download>
          Download
        </Button>
      </Group>
    </ValueRow>
  );
}

/** The Settings section for making blank labels and downloading any label to print. */
export function LabelsSection() {
  const labels = useLabelList();
  const tree = useLocationTree();
  const [making, setMaking] = useState(false);
  const nameOf = (id: string | null) => tree.data?.find((location) => location.id === id)?.name;
  return (
    <PageState status={pageStatusOf(labels)} onRetry={() => void labels.refetch()}>
      <ListSection
        title="Labels"
        action={
          <Button variant="subtle" onClick={() => setMaking(true)}>
            Make blank labels
          </Button>
        }
      >
        {labels.data?.pages
          .flatMap((page) => page.items)
          .map((label) => (
            <LabelRow key={label.code} label={label} locationName={nameOf(label.location_id)} />
          ))}
      </ListSection>
      {labels.hasNextPage && (
        <Button variant="subtle" ml="lg" mt="xs" onClick={() => void labels.fetchNextPage()}>
          Show more
        </Button>
      )}
      <MakeBlankLabelsSheet opened={making} onClose={() => setMaking(false)} />
    </PageState>
  );
}
