import { HistoryRow } from "@/components/HistoryRow";
import { ListSection } from "@/components/ListSection";
import { PageState } from "@/components/PageState";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useAccess } from "@/lib/api/useAccess";
import { madeBy } from "./madeBy";
import { useItemHistory } from "./useItemHistory";
import { whatHappened } from "./whatHappened";

export function ItemHistory({ itemId }: { itemId: string }) {
  const history = useItemHistory(itemId);
  const { account } = useAccess();
  return (
    <PageState status={pageStatusOf(history)} onRetry={() => void history.refetch()}>
      <ListSection title="History">
        {history.data?.map((entry) => (
          <HistoryRow
            key={entry.id}
            happened={whatHappened(entry, itemId)}
            at={new Date(entry.at)}
            by={madeBy(entry, account?.username)}
          />
        ))}
      </ListSection>
    </PageState>
  );
}
