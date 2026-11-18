import { Button } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState, type PageStatus } from "@/components/PageState";
import { AddSheet } from "@/features/locations";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { FilterChips } from "./FilterChips";
import { resultCount } from "./resultCount";
import { SearchResult } from "./SearchResult";
import { addressOf, hasFilters, searchOf, type Search } from "./searchState";
import { useSearchResults, type SearchResult as Result } from "./useSearch";

interface SearchResultsProps {
  /** The header's button for the search showing, such as saving it; left out with no search. */
  action?: (search: Search) => ReactNode;
}

function resultKey(result: Result): string {
  return result.kind === "item" ? `item-${result.item.id}` : `location-${result.location.id}`;
}

function title(search: Search): string {
  return search.query ? `"${search.query}"` : "Search";
}

function emptyMessage(query: string, onAdd: () => void) {
  if (!query) return { statement: "Nothing matches" };
  return {
    statement: `Nothing matches "${query}"`,
    action: <Button onClick={onAdd}>{`Add "${query}"`}</Button>,
  };
}

function shownStatus(searching: boolean, status: PageStatus, found: number): PageStatus {
  if (!searching) return "ready";
  return status === "ready" && found === 0 ? "empty" : status;
}

/** `/search`: what the words in the search field and the filters find, updated as it is typed. */
export function SearchResults({ action }: SearchResultsProps) {
  const search = searchOf(useSearchParams()[0]);
  const navigate = useNavigate();
  const results = useSearchResults(search);
  const [adding, setAdding] = useState(false);
  const pages = results.data?.pages ?? [];
  const found = pages.flatMap((page) => page.results);
  const searching = search.query !== "" || hasFilters(search);
  const header = (
    <PageHeader
      title={title(search)}
      counts={searching ? resultCount(pages[0]?.count) : []}
      actions={searching && action?.(search)}
    />
  );
  return (
    <AppFrame>
      <PageLead
        header={header}
        filters={
          <FilterChips
            search={search}
            onChange={(next) => void navigate(addressOf(next), { replace: true })}
          />
        }
      />
      <PageState
        status={shownStatus(searching, pageStatusOf(results), found.length)}
        empty={emptyMessage(search.query, () => setAdding(true))}
        onRetry={() => void results.refetch()}
      >
        <ListSection>
          {found.map((result) => (
            <SearchResult key={resultKey(result)} result={result} />
          ))}
        </ListSection>
        {results.hasNextPage && (
          <Button variant="subtle" ml="lg" mt="xs" onClick={() => void results.fetchNextPage()}>
            Show more
          </Button>
        )}
      </PageState>
      <AddSheet opened={adding} onClose={() => setAdding(false)} name={search.query} />
    </AppFrame>
  );
}
