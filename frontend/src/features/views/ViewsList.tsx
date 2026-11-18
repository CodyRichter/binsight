import { IconPin, IconSearch } from "@tabler/icons-react";
import { AppFrame } from "@/components/AppFrame";
import { ListSection } from "@/components/ListSection";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState } from "@/components/PageState";
import { ViewRow } from "@/components/ViewRow";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useSavedSearches } from "./useSavedSearches";
import { useViews } from "./useViews";
import { viewIcons } from "./viewWords";

/** `/views`: every built-in view with its count, then the saved searches, pinned first. */
export function ViewsList() {
  const views = useViews();
  const saved = useSavedSearches().data ?? [];
  return (
    <AppFrame current="views" destination>
      <PageLead header={<PageHeader title="Views" />} />
      <PageState status={pageStatusOf(views)} onRetry={() => void views.refetch()}>
        <ListSection>
          {(views.data ?? []).map((view) => (
            <ViewRow
              key={view.view}
              name={view.title}
              icon={viewIcons[view.view]}
              count={view.count}
              to={`/views/${view.view}`}
            />
          ))}
        </ListSection>
        {saved.length > 0 && (
          <ListSection title="Saved searches" count={saved.length}>
            {saved.map((search) => (
              <ViewRow
                key={search.id}
                name={search.name}
                icon={search.pinned ? IconPin : IconSearch}
                count={search.count}
                to={`/views/${search.id}`}
              />
            ))}
          </ListSection>
        )}
      </PageState>
    </AppFrame>
  );
}
