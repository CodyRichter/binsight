import { Button, Chip } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { showToast } from "@/lib/toast";
import { DesignFrame } from "./DesignFrame";
import {
  itemsInside,
  itemUrl,
  locationUrl,
  pathTo,
  sampleItems,
  sampleLocations,
} from "./sampleHome";

const filters = ["Garage", "Category", "Status", "Tag", "Last checked"];

function matches(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function ListSpecimen() {
  const [params] = useSearchParams();
  const [pressed, setPressed] = useState<string[]>([]);
  const query = (params.get("q") ?? "").trim();
  const items = sampleItems.filter((item) => matches(item.name, query));
  const locations = sampleLocations.filter(
    (location) => matches(location.name, query) || matches(location.code ?? "", query),
  );
  const found = items.length + locations.length;
  const added = () => showToast({ message: `Added ${query} to Inbox`, onUndo: () => undefined });
  return (
    <DesignFrame current={null}>
      <PageLead
        header={<PageHeader title={`"${query}"`} counts={[`${found} found`]} />}
        filters={filters.map((filter) => (
          <Chip
            key={filter}
            checked={pressed.includes(filter)}
            onChange={(on) =>
              setPressed(on ? [...pressed, filter] : pressed.filter((other) => other !== filter))
            }
          >
            {filter}
          </Chip>
        ))}
      />
      {found === 0 ? (
        <EmptyState
          statement={`Nothing matches "${query}"`}
          action={
            <Button variant="primary" leftSection={<IconPlus aria-hidden />} onClick={added}>
              Add &quot;{query}&quot;
            </Button>
          }
        />
      ) : (
        <ListSection>
          {locations.map((location) => (
            <LocationRow
              key={location.id}
              name={location.name}
              code={location.code}
              locationType={location.locationType}
              itemCount={itemsInside(location.id).length}
              to={locationUrl(location.id)}
            />
          ))}
          {items.map((item) => (
            <ItemRow
              key={item.id}
              name={item.name}
              to={itemUrl(item.id)}
              path={pathTo(item.home)}
              photoUrl={item.photoUrl}
              status={item.status}
              match={query}
            />
          ))}
        </ListSection>
      )}
    </DesignFrame>
  );
}
