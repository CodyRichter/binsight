import type { ReactNode } from "react";
import { PaneBranchesContext } from "./paneBranches";
import { useOpenBranches } from "./useOpenBranches";

/** Keeps the location pane's open branches while the owner moves between pages. */
export function LocationPaneBranches({ children }: { children: ReactNode }) {
  return (
    <PaneBranchesContext.Provider value={useOpenBranches()}>
      {children}
    </PaneBranchesContext.Provider>
  );
}
