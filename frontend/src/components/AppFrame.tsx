import { useContext, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useNavigation, useSearchParams } from "react-router";
import { SessionCheck } from "./SessionCheck";
import { Frame } from "./Frame";
import { FrameAdditionsContext } from "./frameAdditions";
import type { Destination } from "./navigation";

const searchPage = "/search";

interface AppFrameProps {
  current?: Destination | null;
  destination?: boolean;
  parent?: string;
  /** The location whose page this is, so Add starts there. */
  addTo?: string;
  children: ReactNode;
}

function useSearch() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pending = useNavigation().state !== "idle";
  const searching = pathname === searchPage;
  return {
    query: searching ? (params.get("q") ?? "") : "",
    // Typing replaces the results page, so Back leaves search in one step.
    onChange: (query: string) =>
      navigate(`${searchPage}?q=${encodeURIComponent(query)}`, {
        replace: searching || pending,
        state: { focusSearch: true },
      }),
  };
}

export function AppFrame(props: AppFrameProps) {
  const { current = null, destination, parent, addTo, children } = props;
  const { AddSheet, useInboxCount } = useContext(FrameAdditionsContext);
  const inboxCount = useInboxCount();
  const [adding, setAdding] = useState(false);
  return (
    <Frame
      navigation={{ current, inboxCount }}
      search={useSearch()}
      actions={AddSheet && { onAdd: () => setAdding(true) }}
      destination={destination}
      parent={parent}
    >
      <SessionCheck>
        {children}
        {AddSheet && (
          <AddSheet opened={adding} onClose={() => setAdding(false)} locationId={addTo} />
        )}
      </SessionCheck>
    </Frame>
  );
}
