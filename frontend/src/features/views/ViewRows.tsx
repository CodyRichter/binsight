import { Button } from "@mantine/core";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { timeAgo } from "@/components/timeAgo";
import { ItemListRow, useItemSelection } from "@/features/items";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useViewRows, useViews, type ViewName } from "./useViews";
import { viewEmptyStatements } from "./viewWords";

function since(view: ViewName, at: string | null): string | undefined {
  // The badge already says lent or sold; the row adds how long ago.
  if (!at || (view !== "lent-out" && view !== "archive")) return undefined;
  return timeAgo(new Date(at));
}

function countLine(count: number | undefined): string[] {
  if (count === undefined) return [];
  return [`${count} item${count === 1 ? "" : "s"}`];
}

/** `/views/{view}`: one built-in view's list across the whole home. */
export function ViewRows({ view }: { view: ViewName }) {
  const rows = useViewRows(view);
  const summary = useViews().data?.find((each) => each.view === view);
  const shown = rows.data?.pages.flatMap((page) => page.items) ?? [];
  const status = pageStatusOf(rows);
  const selection = useItemSelection(view);
  return (
    <AppFrame
      current="views"
      currentView={`/views/${view}`}
      parent="/views"
      selectionBar={selection.bar}
    >
      <PageLead
        header={<PageHeader title={summary?.title ?? ""} counts={countLine(summary?.count)} />}
      />
      <PageState
        status={status === "ready" && shown.length === 0 ? "empty" : status}
        empty={{ statement: viewEmptyStatements[view] }}
        onRetry={() => void rows.refetch()}
      >
        <ListSection>
          {shown.map((item) => (
            <ItemListRow
              key={item.id}
              item={item}
              showPath
              since={since(view, view === "lent-out" ? item.lent_at : item.retired_at)}
              select={selection.select?.(item)}
            />
          ))}
        </ListSection>
        {rows.hasNextPage && (
          <Button variant="subtle" ml="lg" mt="xs" onClick={() => void rows.fetchNextPage()}>
            Show more
          </Button>
        )}
      </PageState>
    </AppFrame>
  );
}
