import { HistoryRow } from "@/components/HistoryRow";
import { ListSection } from "@/components/ListSection";
import { PageState } from "@/components/PageState";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useItemHistory } from "./useItemHistory";
import { whatHappened } from "./whatHappened";

export function ItemHistory({ itemId }: { itemId: string }) {
  const history = useItemHistory(itemId);
  return (
    <PageState status={pageStatusOf(history)} onRetry={() => void history.refetch()}>
      <ListSection title="History">
        {history.data?.map((entry) => (
          <HistoryRow
            key={entry.id}
            happened={whatHappened(entry)}
            at={new Date(entry.at)}
            actor={entry.actor}
          />
        ))}
      </ListSection>
    </PageState>
  );
}
