import type { ReactNode } from "react";
import { useState } from "react";
import { useLocation, useNavigate, useNavigation, useSearchParams } from "react-router";
import { Frame } from "@/components/Frame";
import type { Destination } from "@/components/navigation";
import { Sheet } from "@/components/Sheet";
import { AddBarDemo } from "./AddBarDemo";
import { sampleViews } from "./samples";

const searchPage = "/design/list";

interface DesignFrameProps {
  current?: Destination | null;
  currentView?: string;
  parent?: string;
  destination?: boolean;
  selectionBar?: ReactNode;
  children: ReactNode;
}

function useSampleSearch() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pending = useNavigation().state !== "idle";
  const searching = pathname === searchPage;
  return {
    query: searching ? (params.get("q") ?? "") : "",
    // Typing replaces the results page, so Back leaves search in one step.
    onChange: (query: string) =>
      navigate(`${searchPage}?q=${encodeURIComponent(query)}`, { replace: searching || pending }),
  };
}

export function DesignFrame({ current = "home", currentView, parent, ...props }: DesignFrameProps) {
  const [adding, setAdding] = useState(false);
  const search = useSampleSearch();
  return (
    <Frame
      navigation={{ current, currentView, inboxCount: 3 }}
      views={sampleViews}
      search={search}
      actions={{ onAdd: () => setAdding(true), onScan: () => undefined }}
      parent={parent ?? "/design"}
      destination={props.destination}
      selectionBar={props.selectionBar}
    >
      {props.children}
      <Sheet opened={adding} title="Add" onClose={() => setAdding(false)}>
        <AddBarDemo autoFocus />
      </Sheet>
    </Frame>
  );
}
