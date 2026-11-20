import { useContext, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useAccess } from "@/lib/api/useAccess";
import { gateAddress } from "@/lib/returnAddress";
import { SessionCheck, type PageAudience } from "./SessionCheck";
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
  /** The location lit in the location pane; the pane shows only when this is given. */
  paneLocation?: string;
  /** Shown in the bottom bar's place while rows are selected. */
  selectionBar?: ReactNode;
  /** Who may open the page; anyone, by default, sees it read-only when signed out. */
  audience?: PageAudience;
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

/** Whether Add is open: by its button, or by `?add`, the home screen shortcut's address. */
function useAdding(): [boolean, (open: boolean) => void] {
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const asked = params.has("add");
  const change = (open: boolean) => {
    setAdding(open);
    if (open || !asked) return;
    const rest = new URLSearchParams(params);
    rest.delete("add");
    setParams(rest, { replace: true });
  };
  return [adding || asked, change];
}

export function AppFrame(props: AppFrameProps) {
  const { current = null, destination, parent, currentView, addTo, selectionBar, children } = props;
  const { canEdit, canView } = useAccess();
  const { pathname, search } = useLocation();
  const frameAdditions = useContext(FrameAdditionsContext);
  const { useInboxCount, useViewsSection, LocationPane } = frameAdditions;
  const AddSheet = canEdit ? frameAdditions.AddSheet : undefined;
  const inboxCount = useInboxCount();
  const viewsSection = useViewsSection(currentView, current === "views");
  const [adding, setAdding] = useAdding();
  const navigate = useNavigate();
  return (
    <Frame
      navigation={{
        current,
        inboxCount,
        signInAt: canView ? undefined : gateAddress(pathname + search),
      }}
      sections={viewsSection && [viewsSection]}
      search={useSearch()}
      actions={{ onAdd: AddSheet && (() => setAdding(true)), onScan: () => navigate("/scan") }}
      destination={destination}
      parent={parent}
      selectionBar={selectionBar}
      pane={LocationPane && props.paneLocation && <LocationPane current={props.paneLocation} />}
    >
      <SessionCheck audience={props.audience ?? "anyone"}>
        {children}
        {AddSheet && (
          <AddSheet opened={adding} onClose={() => setAdding(false)} locationId={addTo} />
        )}
      </SessionCheck>
    </Frame>
  );
}
