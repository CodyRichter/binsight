import { Button } from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { PageHeader } from "@/components/PageHeader";
import { PageLead } from "@/components/PageLead";
import { PageState, type PageStatus } from "@/components/PageState";
import { pathSegments } from "@/features/items";
import { pageStatusOf } from "@/lib/api/pageStatus";
import { useRestoreLocation } from "./useLocationRemoval";
import { parentPage } from "./parentPage";
import { useLocation, type Location } from "./useLocations";

const nothingHere = {
  statement: "Nothing at this address",
  action: (
    <Button component={Link} to="/">
      Show all locations
    </Button>
  ),
};

function pageStatus(found: ReturnType<typeof useLocation>): PageStatus {
  // A live one here is newer than the tree, which is being read again.
  if (found.data && !found.data.deleted_at) return "loading";
  if (found.data === null) return "notFound";
  return pageStatusOf(found);
}

function deletedHeader(location: Location, deletedAt: string, onRestore: () => void): ReactNode {
  return (
    <PageHeader
      title={location.name}
      parents={pathSegments(location.path.slice(0, -1))}
      code={location.label_code ?? undefined}
      since={{ words: "Deleted", at: new Date(deletedAt) }}
      actions={
        <Button leftSection={<IconArrowBackUp aria-hidden />} onClick={onRestore}>
          Restore
        </Button>
      }
    />
  );
}

/** A location the tree leaves out: a deleted one, with Restore, or nothing at this address. */
export function DeletedLocation({ id }: { id: string }) {
  const found = useLocation(id);
  const restore = useRestoreLocation();
  const location = found.data;
  return (
    <AppFrame current="home" parent={parentPage(location)}>
      <PageState
        status={pageStatus(found)}
        standalone
        notFound={nothingHere}
        onRetry={() => void found.refetch()}
      >
        {location?.deleted_at && (
          <PageLead
            header={deletedHeader(location, location.deleted_at, () => restore(location))}
          />
        )}
      </PageState>
    </AppFrame>
  );
}
