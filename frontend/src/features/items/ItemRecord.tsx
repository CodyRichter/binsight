import { useState } from "react";
import { useParams } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { PageState } from "@/components/PageState";
import { ItemHistory } from "@/features/history";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useItem, type Item } from "./useItems";
import { ItemAttachments } from "./ItemAttachments";
import { ItemDetails } from "./ItemDetails";
import { ItemHeader } from "./ItemHeader";
import { ItemLinks } from "./ItemLinks";
import { useItemLinks } from "./useItemLinks";

function ItemBody({ item }: { item: Item }) {
  const deleted = item.deleted_at !== null;
  const links = useItemLinks(item.id, !deleted).data?.items ?? [];
  const [attaching, setAttaching] = useState(false);
  return (
    <>
      <ItemHeader
        item={item}
        linkedIds={links.map((each) => each.item.id)}
        onAttach={() => setAttaching(true)}
      />
      {!deleted && <ItemDetails item={item} />}
      {!deleted && <ItemAttachments item={item} attaching={attaching} onAttaching={setAttaching} />}
      {!deleted && <ItemLinks item={item} links={links} />}
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
