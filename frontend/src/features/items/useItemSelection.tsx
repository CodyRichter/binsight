import { useState, type ReactNode } from "react";
import { useAccess } from "@/lib/api/useAccess";
import { ItemSelectionBar } from "./ItemSelectionBar";
import type { Item } from "./useItems";

/** What a row needs to show its select box. */
export interface RowSelect {
  selected: boolean;
  onChange: (selected: boolean) => void;
}

export interface ItemSelection {
  /** Left out for someone who may not change items, so rows show no select box. */
  select?: (item: Pick<Item, "id">) => RowSelect;
  /** The selection bar, for the page's frame; undefined while nothing is selected. */
  bar: ReactNode;
}

/** The items selected in one list; `list` names it, so another list starts with none. */
export function useItemSelection(list: string, here: string | null = null): ItemSelection {
  const { canEdit } = useAccess();
  const [selection, setSelection] = useState<{ list: string; ids: string[] }>({ list, ids: [] });
  const ids = selection.list === list ? selection.ids : [];
  const end = () => setSelection({ list, ids: [] });
  const select = (item: Pick<Item, "id">): RowSelect => ({
    selected: ids.includes(item.id),
    onChange: (on) =>
      setSelection({
        list,
        ids: on ? [...ids, item.id] : ids.filter((id) => id !== item.id),
      }),
  });
  const bar = ids.length > 0 && <ItemSelectionBar ids={ids} here={here} onEnd={end} />;
  return { select: canEdit ? select : undefined, bar: bar || undefined };
}
