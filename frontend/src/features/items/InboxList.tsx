import { Button } from "@mantine/core";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { ItemListRow } from "./ItemListRow";
import { useInbox, useInboxCount } from "./useInbox";
import { useItemSelection } from "./useItemSelection";

function countLine(count: number | undefined): string[] {
  if (count === undefined) return [];
  return [count === 1 ? "1 item" : `${count} items`];
}

/** The inbox: every item still missing a name or a home location, with its path. */
export function InboxList() {
  const inbox = useInbox();
  const count = useInboxCount();
  const items = inbox.data?.pages.flatMap((page) => page.items) ?? [];
  const status = pageStatusOf(inbox);
  const selection = useItemSelection("inbox");
  return (
    <AppFrame current="inbox" destination selectionBar={selection.bar}>
      <PageLead header={<PageHeader title="Inbox" counts={countLine(count)} />} />
      <PageState
        status={status === "ready" && items.length === 0 ? "empty" : status}
        empty={{ statement: "Nothing is missing" }}
        onRetry={() => void inbox.refetch()}
      >
        <ListSection>
          {items.map((item) => (
            <ItemListRow key={item.id} item={item} showPath select={selection.select?.(item)} />
          ))}
        </ListSection>
        {inbox.hasNextPage && (
          <Button variant="subtle" ml="lg" mt="xs" onClick={() => void inbox.fetchNextPage()}>
            Show more
          </Button>
        )}
      </PageState>
    </AppFrame>
  );
}
