import { PageState } from "@/components/PageState";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { Tree } from "./LocationTree";
import { useLocationTree, type Location } from "./useLocations";

interface ClaimTreeProps {
  onClaim: (location: Location) => void;
  onAddInside: (location: Location) => void;
}

/** Every location as a tree, where tapping a row claims a label for it. */
export function ClaimTree({ onClaim, onAddInside }: ClaimTreeProps) {
  const tree = useLocationTree();
  return (
    <PageState status={pageStatusOf(tree)} onRetry={() => void tree.refetch()}>
      {tree.data && <Tree locations={tree.data} onPick={onClaim} onAddInside={onAddInside} />}
    </PageState>
  );
}
