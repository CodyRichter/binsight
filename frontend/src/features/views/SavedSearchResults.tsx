import { Button } from "@mantine/core";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { SearchResult } from "@/features/search";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { SavedSearchHeader } from "./SavedSearchHeader";
import { useSavedSearch, useSavedSearchRows } from "./useSavedSearches";

/** `/views/{id}` for a saved search: what its words and filters find now. */
export function SavedSearchResults({ id }: { id: string }) {
  const saved = useSavedSearch(id);
  const rows = useSavedSearchRows(id);
  const found = rows.data?.pages.flatMap((page) => page.results) ?? [];
  const status = pageStatusOf(rows);
  return (
    <AppFrame current="views" currentView={`/views/${id}`} parent="/views">
      <PageState status={pageStatusOf(saved)} onRetry={() => void saved.refetch()}>
        {saved.data && <PageLead header={<SavedSearchHeader saved={saved.data} />} />}
        <PageState
          status={status === "ready" && found.length === 0 ? "empty" : status}
          empty={{ statement: "Nothing matches" }}
          onRetry={() => void rows.refetch()}
        >
          <ListSection>
            {found.map((result) => (
              <SearchResult
                key={result.kind === "item" ? result.item.id : result.location.id}
                result={result}
              />
            ))}
          </ListSection>
          {rows.hasNextPage && (
            <Button variant="subtle" ml="lg" mt="xs" onClick={() => void rows.fetchNextPage()}>
              Show more
            </Button>
          )}
        </PageState>
      </PageState>
    </AppFrame>
  );
}
