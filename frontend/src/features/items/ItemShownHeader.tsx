import { PageHeader } from "@/components/PageHeader";
import { since } from "./itemSince";
import { pathSegments } from "./pathSegments";
import type { Item } from "./useItems";

/** An item page's header for someone who may not change it: no buttons and no More. */
export function ItemShownHeader({ item }: { item: Item }) {
  return (
    <PageHeader
      title={item.name ?? ""}
      untitled="Unnamed"
      parents={pathSegments(item.path)}
      thumbnail={{ photoUrl: item.photo_url ?? undefined }}
      since={since(item)}
      status={{ status: item.status, lentTo: item.lent_to ?? undefined }}
      counts={item.quantity > 1 ? [`Quantity ${item.quantity}`] : undefined}
    />
  );
}
