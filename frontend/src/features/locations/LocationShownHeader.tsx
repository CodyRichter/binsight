import { Menu } from "@mantine/core";
import { IconFileText, IconShieldCheck } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/PageHeader";
import { pathSegments } from "@/features/items";
import { useAccess } from "@/lib/api/useAccess";
import { countWords } from "./countWords";
import { LabelSheet } from "./LabelSheet";
import type { Location } from "./useLocations";

/** A location's header for someone who may not change it: its label and print pages only. */
export function LocationShownHeader({ location }: { location: Location }) {
  const { canView } = useAccess();
  const [showingLabel, setShowingLabel] = useState(false);
  return (
    <>
      <PageHeader
        title={location.name}
        parents={pathSegments(location.path.slice(0, -1))}
        code={location.id}
        onCodeClick={() => setShowingLabel(true)}
        thumbnail={{
          photoUrl: location.photo_url ?? undefined,
          locationType: location.type,
          locationIcon: location.icon,
        }}
        summary={location.summary ? { value: location.summary } : undefined}
        counts={[countWords(location.item_count, "item")]}
        menu={
          <>
            <Menu.Item
              component={Link}
              to={`/locations/${location.id}/sheet`}
              leftSection={<IconFileText aria-hidden size={20} />}
            >
              Contents sheet
            </Menu.Item>
            {canView && (
              <Menu.Item
                component={Link}
                to={`/locations/${location.id}/insurance`}
                leftSection={<IconShieldCheck aria-hidden size={20} />}
              >
                Insurance list
              </Menu.Item>
            )}
          </>
        }
      />
      <LabelSheet code={location.id} opened={showingLabel} onClose={() => setShowingLabel(false)} />
    </>
  );
}
