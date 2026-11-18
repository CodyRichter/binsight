import { Button } from "@mantine/core";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { timeAgo } from "@/components/timeAgo";
import { ItemListRow } from "@/features/items";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useViewRows, useViews, type ViewName, type ViewRow } from "./useViews";
import { viewEmptyStatements } from "./viewWords";

function since(view: ViewName, at: string | null): string | undefined {
  // The badge already says lent or sold; the row adds how long ago.
  if (!at || (view !== "lent-out" && view !== "archive")) return undefined;
  return timeAgo(new Date(at));
}

function Row({ view, row }: { view: ViewName; row: ViewRow }) {
  if (row.kind === "item") {
    const at = view === "lent-out" ? row.item.lent_at : row.item.retired_at;
    return <ItemListRow item={row.item} showPath since={since(view, at)} />;
  }
  const { location } = row;
  return (
    <LocationRow
      name={location.name}
      locationType={location.type}
      code={location.label_code ?? undefined}
      itemCount={location.direct_item_count}
      lastChecked={location.last_checked_at ? new Date(location.last_checked_at) : null}
      to={`/locations/${location.id}`}
    />
  );
}

function countLine(view: ViewName, count: number | undefined): string[] {
  if (count === undefined) return [];
  const word = view === "not-checked" ? "location" : "item";
  return [`${count} ${word}${count === 1 ? "" : "s"}`];
}

/** `/views/{view}`: one built-in view's list across the whole home. */
export function ViewRows({ view }: { view: ViewName }) {
  const rows = useViewRows(view);
  const summary = useViews().data?.find((each) => each.view === view);
  const shown = rows.data?.pages.flatMap((page) => page.items) ?? [];
  const status = pageStatusOf(rows);
  return (
    <AppFrame current="views" currentView={`/views/${view}`} parent="/views">
      <PageLead
        header={
          <PageHeader title={summary?.title ?? ""} counts={countLine(view, summary?.count)} />
        }
      />
      <PageState
        status={status === "ready" && shown.length === 0 ? "empty" : status}
        empty={{ statement: viewEmptyStatements[view] }}
        onRetry={() => void rows.refetch()}
      >
        <ListSection>
          {shown.map((row) => (
            <Row key={row.kind === "item" ? row.item.id : row.location.id} view={view} row={row} />
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
