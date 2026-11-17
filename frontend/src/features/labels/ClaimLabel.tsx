import { Button } from "@mantine/core";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ClaimTree, NewLocationSheet, type NewLocationPlace } from "@/features/locations";
import { useClaimLabel } from "./useLabels";

/** A blank label's page: the tree of locations to claim it for, or a new one. */
export function ClaimLabel({ code }: { code: string }) {
  const claim = useClaimLabel();
  const [place, setPlace] = useState<NewLocationPlace | null>(null);
  const claimFor = (location: { id: string; name: string }) => claim(code, location);
  return (
    <>
      <PageHeader
        title="Blank label"
        code={code}
        blankCode
        actions={<Button onClick={() => setPlace({ parent: null })}>Add location</Button>}
      />
      <ClaimTree onClaim={claimFor} onAddInside={(parent) => setPlace({ parent })} />
      <NewLocationSheet place={place} onClose={() => setPlace(null)} onCreated={claimFor} />
    </>
  );
}
