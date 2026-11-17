import { Button, Menu } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { PageHeader } from "@/components/PageHeader";
import { pathSegments } from "@/features/items";
import { labelImageAddress } from "@/lib/api/labelImageAddress";
import { countWords } from "./countWords";
import type { Location } from "./useLocations";

interface LocationHeaderProps {
  location: Location;
  onAddLocation?: () => void;
}

function labelMenu(code: string) {
  return (
    <Menu.Item
      component="a"
      href={labelImageAddress(code)}
      download
      leftSection={<IconDownload aria-hidden size={20} />}
    >
      Download label
    </Menu.Item>
  );
}

export function LocationHeader({ location, onAddLocation }: LocationHeaderProps) {
  const code = location.label_code ?? undefined;
  return (
    <PageHeader
      title={location.name}
      parents={pathSegments(location.path.slice(0, -1))}
      code={code}
      counts={[countWords(location.item_count, "item")]}
      actions={onAddLocation && <Button onClick={onAddLocation}>Add location</Button>}
      menu={code && labelMenu(code)}
    />
  );
}
