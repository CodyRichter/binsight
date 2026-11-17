import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useAuthStatus } from "@/lib/api/useAuthStatus";
import { gateAddress } from "@/lib/returnAddress";
import { PageState } from "./PageState";

export function SessionCheck({ children }: { children: ReactNode }) {
  const status = useAuthStatus();
  const { pathname, search, hash } = useLocation();
  if (status.data && !status.data.signed_in) {
    return <Navigate replace to={gateAddress(pathname + search + hash)} />;
  }
  return (
    <PageState status={pageStatusOf(status)} onRetry={() => void status.refetch()}>
      {children}
    </PageState>
  );
}
