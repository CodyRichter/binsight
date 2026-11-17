import { Button, Menu } from "@mantine/core";
import { IconArrowsMove, IconDownload } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { pathSegments } from "@/features/items";
import { labelImageAddress } from "@/lib/api/labelImageAddress";
import { countWords } from "./countWords";
import { MoveSheet } from "./MoveSheet";
import { useMoveLocation } from "./useMoveLocation";
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
  const [moving, setMoving] = useState(false);
  const move = useMoveLocation(location);
  // A site is the top of its tree, so it has nowhere to move to.
  const movable = location.parent_id !== null;
  return (
    <>
      <PageHeader
        title={location.name}
        parents={pathSegments(location.path.slice(0, -1))}
        code={code}
        counts={[countWords(location.item_count, "item")]}
        actions={
          (onAddLocation || movable) && (
            <>
              {movable && (
                <Button
                  leftSection={<IconArrowsMove aria-hidden />}
                  onClick={() => setMoving(true)}
                >
                  Move
                </Button>
              )}
              {onAddLocation && <Button onClick={onAddLocation}>Add location</Button>}
            </>
          )
        }
        menu={code && labelMenu(code)}
      />
      {movable && (
        <MoveSheet
          opened={moving}
          onClose={() => setMoving(false)}
          currentId={location.parent_id}
          movingId={location.id}
          onPick={move}
        />
      )}
    </>
  );
}
