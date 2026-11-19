import type { ReactNode } from "react";
import { useAccess } from "@/lib/api/useAccess";

/** Shows its children only to an admin: settings that manage the install, not the home. */
export function AdminOnly({ children }: { children: ReactNode }) {
  return useAccess().isAdmin ? children : null;
}
