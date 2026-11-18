import { useContext, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { SessionCheck } from "./SessionCheck";
import { Frame } from "./Frame";
import { FrameAdditionsContext } from "./frameAdditions";
import type { Destination } from "./navigation";

const searchPage = "/search";

interface AppFrameProps {
  current?: Destination | null;
  destination?: boolean;
  parent?: string;
  /** The address of the view or saved search showing, lit alone in the navigation. */
  currentView?: string;
  /** The location whose page this is, so Add starts there. */
  addTo?: string;
  children: ReactNode;
}

function useSearch() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const searching = pathname === searchPage;
  return {
    query: searching ? (params.get("q") ?? "") : "",
    // Typing replaces the results page, so Back leaves search in one step. A replace while the
    // first push is still loading would replace the page the search began on instead.
    onChange: (query: string) => {
      // Filters already set on the results page stay set while the words change.
      const next = new URLSearchParams(searching ? params : undefined);
      next.set("q", query);
      navigate(`${searchPage}?${next}`, { replace: searching, state: { focusSearch: true } });
    },
  };
}

export function AppFrame(props: AppFrameProps) {
  const { current = null, destination, parent, currentView, addTo, children } = props;
  const { AddSheet, useInboxCount, useViewsSection } = useContext(FrameAdditionsContext);
  const inboxCount = useInboxCount();
  const viewsSection = useViewsSection(currentView, current === "views");
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  return (
    <Frame
      navigation={{ current, inboxCount }}
      sections={viewsSection && [viewsSection]}
      search={useSearch()}
      actions={{ onAdd: AddSheet && (() => setAdding(true)), onScan: () => navigate("/scan") }}
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
