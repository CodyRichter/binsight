import { Button } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { countWords } from "./countWords";
import type { Location } from "./useLocations";

interface LocationHeaderProps {
  location: Location;
  onAddLocation?: () => void;
}

export function LocationHeader({ location, onAddLocation }: LocationHeaderProps) {
  const parents = location.path
    .slice(0, -1)
    .map((step) => ({ name: step.name, to: `/locations/${step.id}` }));
  return (
    <PageHeader
      title={location.name}
      parents={parents}
      counts={[countWords(location.item_count, "item")]}
      actions={onAddLocation && <Button onClick={onAddLocation}>Add location</Button>}
    />
  );
}
