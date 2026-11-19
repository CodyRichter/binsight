import { useContext, useState } from "react";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { ListSection } from "@/components/ListSection";
import { useMoveItem, type Item, type ItemSelection } from "@/features/items";
import { SearchResult } from "./SearchResult";
import type { SearchResult as Result } from "./useSearch";
import { useAccess } from "@/lib/api/useAccess";

interface FoundListProps {
  found: Result[];
  selection: ItemSelection;
}

function resultKey(result: Result): string {
  return result.kind === "item" ? `item-${result.item.id}` : `location-${result.location.id}`;
}

/** What a search found, each item with Move, so it can be put right where it was found. */
export function FoundList({ found, selection }: FoundListProps) {
  const { MoveSheet } = useContext(FrameAdditionsContext);
  const { canEdit } = useAccess();
  const [moving, setMoving] = useState<Item>();
  const move = useMoveItem();
  return (
    <>
      <ListSection>
        {found.map((result) => (
          <SearchResult
            key={resultKey(result)}
            result={result}
            selection={selection}
            onMove={canEdit && MoveSheet ? setMoving : undefined}
          />
        ))}
      </ListSection>
      {MoveSheet && (
        <MoveSheet
          opened={moving !== undefined}
          onClose={() => setMoving(undefined)}
          currentId={moving?.home_location_id ?? null}
          onPick={(place) => moving && move(moving, place)}
        />
      )}
    </>
  );
}
