import { Button } from "@mantine/core";
import { Link, useParams } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { PageState } from "@/components/PageState";
import { LocationView } from "@/features/locations";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { ClaimLabel } from "./ClaimLabel";
import { useLabel } from "./useLabels";

function unknownCode(code: string) {
  return {
    statement: `No label has the code ${code}`,
    action: (
      <Button component={Link} to="/">
        Show all locations
      </Button>
    ),
  };
}

/** What a label's address shows: its location, a blank label to claim, or an unknown code. */
export function LabelAddress() {
  const { code = "" } = useParams();
  const label = useLabel(code);
  const locationId = label.data?.location_id;
  if (locationId) return <LocationView id={locationId} />;
  return (
    <AppFrame current="home" parent="/">
      <PageState
        status={label.data === null ? "notFound" : pageStatusOf(label)}
        standalone
        notFound={unknownCode(code)}
        onRetry={() => void label.refetch()}
      >
        {label.data && <ClaimLabel key={label.data.code} code={label.data.code} />}
      </PageState>
    </AppFrame>
  );
}
