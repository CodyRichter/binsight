import type { ReactNode } from "react";
import { useLocation, useNavigate, useNavigation, useSearchParams } from "react-router";
import { BackendCheck } from "./BackendCheck";
import { Frame } from "./Frame";
import type { Destination } from "./navigation";

const searchPage = "/search";

interface AppFrameProps {
  current?: Destination | null;
  destination?: boolean;
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

export function AppFrame({ current = null, destination, children }: AppFrameProps) {
  return (
    <Frame navigation={{ current }} search={useSearch()} destination={destination}>
      <BackendCheck>{children}</BackendCheck>
    </Frame>
  );
}
