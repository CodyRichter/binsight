import { useParams } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ItemHistory } from "@/features/history";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { pathSegments } from "./pathSegments";
import { useItem, type Item } from "./useItems";
import { useQuantity } from "./useQuantity";

function ItemBody({ item }: { item: Item }) {
  const changeQuantity = useQuantity(item);
  return (
    <>
      <PageLead
        header={<PageHeader title={item.name ?? ""} parents={pathSegments(item)} thumbnail={{}} />}
      >
        <QuantityStepper value={item.quantity} onChange={changeQuantity} />
      </PageLead>
      <ItemHistory itemId={item.id} />
    </>
  );
}

export function ItemRecord() {
  const { id = "" } = useParams();
  const item = useItem(id);
  const home = item.data?.home_location_id;
  return (
    <AppFrame current="home" parent={home ? `/locations/${home}` : "/"}>
      <PageState status={pageStatusOf(item)} onRetry={() => void item.refetch()}>
        {item.data && <ItemBody key={item.data.id} item={item.data} />}
      </PageState>
    </AppFrame>
  );
}
