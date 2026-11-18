import { useParams } from "react-router";
import { CodeChip } from "@/components/CodeChip";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageState } from "@/components/PageState";
import { PrintFrame } from "@/components/PrintFrame";
import { PrintedLabel } from "@/components/PrintedLabel";
import { PrintItem } from "@/components/PrintItem";
import { itemName, pathSegments } from "@/features/items";
import { labelImageAddress } from "@/lib/api/labelImageAddress";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { statusNote } from "./printWords";
import { useClosePrint, useContentsSheet, type ContentsSheet } from "./usePrintPages";

type SheetGroup = ContentsSheet["groups"][number];

function groupTitle(group: SheetGroup, sheet: ContentsSheet): string {
  // Below the sheet's own location, so a bin reads "Shelf 2 > Cables" rather than its whole path.
  const below = group.path.slice(sheet.location.path.length - 1);
  return below.map((step) => step.name).join(" > ");
}

function SheetBody({ sheet }: { sheet: ContentsSheet }) {
  const { location } = sheet;
  const count = sheet.groups.reduce((total, group) => total + group.items.length, 0);
  return (
    <>
      <PageHeader
        title={location.name}
        parents={pathSegments(location.path.slice(0, -1))}
        code={location.label_code ?? undefined}
        lastChecked={location.last_checked_at ? new Date(location.last_checked_at) : null}
        counts={[count === 1 ? "1 item" : `${count} items`]}
      />
      {location.label_code && (
        <PrintedLabel
          code={location.label_code}
          imageUrl={labelImageAddress(location.label_code)}
        />
      )}
      {sheet.groups.map((group) => (
        <ListSection
          key={group.location_id}
          title={groupTitle(group, sheet)}
          count={group.items.length}
          action={group.label_code ? <CodeChip code={group.label_code} /> : undefined}
        >
          {group.items.map((item) => (
            <PrintItem
              key={item.id}
              name={itemName(item.name)}
              quantity={item.quantity}
              note={statusNote(item.status)}
            />
          ))}
        </ListSection>
      ))}
    </>
  );
}

function SheetState({ locationId }: { locationId: string }) {
  const sheet = useContentsSheet(locationId);
  return (
    <PageState status={pageStatusOf(sheet)} onRetry={() => void sheet.refetch()}>
      {sheet.data && <SheetBody sheet={sheet.data} />}
    </PageState>
  );
}

/** A location's contents at /locations/{id}/sheet, grouped by where each item is kept. */
export function ContentsSheetPrint() {
  const { id = "" } = useParams();
  const close = useClosePrint(`/locations/${id}`);
  return (
    <PrintFrame name="Contents sheet" onClose={close}>
      <SheetState key={id} locationId={id} />
    </PrintFrame>
  );
}
