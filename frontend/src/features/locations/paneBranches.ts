import { createContext } from "react";
import type { OpenBranches } from "./useOpenBranches";

// Held above the routes, so the branches opened in the pane stay open from page to page.
export const PaneBranchesContext = createContext<OpenBranches | undefined>(undefined);
