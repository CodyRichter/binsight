import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useAccess } from "@/lib/api/useAccess";
import { useAuthStatus } from "@/lib/api/useAuthStatus";
import { gateAddress } from "@/lib/returnAddress";
import { PageState } from "./PageState";

/** Who a page is for: anyone, unless it needs a signed-in account or an admin. */
export type PageAudience = "anyone" | "signed in" | "admin";

interface SessionCheckProps {
  audience: PageAudience;
  children: ReactNode;
}

export function SessionCheck({ audience, children }: SessionCheckProps) {
  const status = useAuthStatus();
  const { canView, isAdmin } = useAccess();
  const { pathname, search, hash } = useLocation();
  const shut = (audience === "signed in" && !canView) || (audience === "admin" && !isAdmin);
  if (status.data && (status.data.setup_needed || shut)) {
    return <Navigate replace to={gateAddress(pathname + search + hash)} />;
  }
  return (
    <PageState status={pageStatusOf(status)} onRetry={() => void status.refetch()}>
      {children}
    </PageState>
  );
}
