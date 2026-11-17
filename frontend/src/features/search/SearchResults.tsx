import { Button } from "@mantine/core";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState, type PageStatus } from "@/components/PageState";
import { AddSheet } from "@/features/locations";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { SearchResult } from "./SearchResult";
import { useSearchResults, type SearchResult as Result } from "./useSearch";

function countLine(count: number | undefined): string[] {
  if (count === undefined) return [];
  return [count === 1 ? "1 result" : `${count} results`];
}

function resultKey(result: Result): string {
  return result.kind === "item" ? `item-${result.item.id}` : `location-${result.location.id}`;
}

function header(query: string, count: number | undefined) {
  if (!query) return <PageHeader title="Search" />;
  return <PageHeader title={`"${query}"`} counts={countLine(count)} />;
}

function shownStatus(query: string, status: PageStatus, found: number): PageStatus {
  if (!query) return "ready";
  return status === "ready" && found === 0 ? "empty" : status;
}

/** `/search`: what the query in the search field finds, updated as it is typed. */
export function SearchResults() {
  const query = (useSearchParams()[0].get("q") ?? "").trim();
  const search = useSearchResults(query);
  const [adding, setAdding] = useState(false);
  const pages = search.data?.pages ?? [];
  const results = pages.flatMap((page) => page.results);
  return (
    <AppFrame>
      <PageLead header={header(query, pages[0]?.count)} />
      <PageState
        status={shownStatus(query, pageStatusOf(search), results.length)}
        empty={{
          statement: `Nothing matches "${query}"`,
          action: <Button onClick={() => setAdding(true)}>{`Add "${query}"`}</Button>,
        }}
        onRetry={() => void search.refetch()}
      >
        <ListSection>
          {results.map((result) => (
            <SearchResult key={resultKey(result)} result={result} />
          ))}
        </ListSection>
        {search.hasNextPage && (
          <Button variant="subtle" ml="lg" mt="xs" onClick={() => void search.fetchNextPage()}>
            Show more
          </Button>
        )}
      </PageState>
      <AddSheet opened={adding} onClose={() => setAdding(false)} name={query} />
    </AppFrame>
  );
}
