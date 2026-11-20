import { useContext, useEffect, useRef } from "react";
import { PaneBranchesContext } from "./paneBranches";
import { Tree } from "./LocationTree";
import { ancestorIds } from "./treeRows";
import { useLocationTree } from "./useLocations";
import { useOpenBranches } from "./useOpenBranches";
import { usePaneKeyboard } from "./usePaneKeyboard";

/** Brings the current location's row into view once per location, after its branch opens. */
function useCurrentRowInView(current: string) {
  const pane = useRef<HTMLDivElement>(null);
  const shownFor = useRef<string>(undefined);
  useEffect(() => {
    if (shownFor.current === current) return;
    const row = pane.current?.querySelector('[aria-current="page"]');
    if (!row) return;
    row.scrollIntoView({ block: "nearest" });
    shownFor.current = current;
  });
  return pane;
}

/** Every location as a tree beside a page, with the page's location lit and its branch open. */
export function LocationPane({ current }: { current: string }) {
  const tree = useLocationTree();
  const ownBranches = useOpenBranches();
  const branches = useContext(PaneBranchesContext) ?? ownBranches;
  const { openAll } = branches;
  const locations = tree.data;
  useEffect(() => {
    if (locations) openAll(ancestorIds(locations, current));
  }, [locations, current, openAll]);
  const pane = useCurrentRowInView(current);
  const onKeyDown = usePaneKeyboard(pane);
  return (
    <div ref={pane} onKeyDown={onKeyDown}>
      {locations && <Tree locations={locations} current={current} branches={branches} compact />}
    </div>
  );
}
