import { useParams } from "react-router";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageState } from "@/components/PageState";
import { PrintFrame } from "@/components/PrintFrame";
import { PrintItem } from "@/components/PrintItem";
import { itemName, pathSegments } from "@/features/items";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { insuranceCounts, insuredDetails, statusNote } from "./printWords";
import { useClosePrint, useInsuranceList, type InsuranceList } from "./usePrintPages";

function madeOn(madeAt: string): string {
  return `Made ${new Date(madeAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`;
}

function InsuranceListBody({ list }: { list: InsuranceList }) {
  return (
    <>
      <PageHeader
        title={list.title}
        parents={pathSegments(list.path.slice(0, -1))}
        counts={[...insuranceCounts(list), madeOn(list.made_at)]}
      />
      <ListSection title="Items" count={list.item_count}>
        {list.items.map((item) => (
          <PrintItem
            key={item.id}
            name={itemName(item.name)}
            quantity={item.quantity}
            note={statusNote(item.status)}
            details={insuredDetails(item)}
            photoUrls={item.photo_urls}
          />
        ))}
      </ListSection>
    </>
  );
}

function InsuranceListState({ locationId }: { locationId?: string }) {
  const list = useInsuranceList(locationId);
  return (
    <PageState status={pageStatusOf(list)} onRetry={() => void list.refetch()}>
      {list.data && <InsuranceListBody list={list.data} />}
    </PageState>
  );
}

/** Every item still owned, at /insurance or in one location, laid out to print. */
export function InsuranceListPrint() {
  const { id } = useParams();
  const close = useClosePrint(id ? `/locations/${id}` : "/settings");
  return (
    <PrintFrame name="Insurance list" onClose={close}>
      <InsuranceListState key={id ?? "everything"} locationId={id} />
    </PrintFrame>
  );
}
