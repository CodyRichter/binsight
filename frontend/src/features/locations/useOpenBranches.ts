import { useCallback, useState } from "react";

export interface OpenBranches {
  open: Set<string>;
  toggle: (id: string) => void;
  /** Opens every one of these branches, leaving the others as they are. */
  openAll: (ids: string[]) => void;
}

/** Which locations in a tree are expanded to show what is inside them. */
export function useOpenBranches(): OpenBranches {
  const [open, setOpen] = useState(new Set<string>());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const openAll = useCallback(
    (ids: string[]) =>
      setOpen((current) =>
        ids.every((id) => current.has(id)) ? current : new Set([...current, ...ids]),
      ),
    [],
  );
  return { open, toggle, openAll };
}
