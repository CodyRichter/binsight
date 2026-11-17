import { Navigate, useSearchParams } from "react-router";
import { GateFrame } from "@/components/GateFrame";
import { PageState } from "@/components/PageState";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useAuthStatus } from "@/lib/api/useAuthStatus";
import { returnAddress } from "@/lib/returnAddress";
import { CreateOwnerForm } from "./CreateOwnerForm";
import { SignInForm } from "./SignInForm";

export function Gate() {
  const status = useAuthStatus();
  const [params] = useSearchParams();
  if (status.data?.signed_in) return <Navigate replace to={returnAddress(params.get("next"))} />;
  return (
    <GateFrame>
      <PageState status={pageStatusOf(status)} onRetry={() => void status.refetch()}>
        {status.data?.owner_exists ? <SignInForm /> : <CreateOwnerForm />}
      </PageState>
    </GateFrame>
  );
}
