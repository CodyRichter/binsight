import { useNavigate, useRouteError, type RouteObject } from "react-router";
import { RouteError } from "@/components/RouteError";
import { DesignFrame } from "@/features/design";

/** A route whose page loads on its first visit. */
export function page(path: string, load: () => Promise<{ Component: () => React.JSX.Element }>) {
  return { path, lazy: load };
}

function DesignShellError() {
  const error = useRouteError();
  const navigate = useNavigate();
  return (
    <DesignFrame>
      <RouteError
        error={error}
        onRetry={() => navigate(0)}
        onGoHome={() => navigate("/design")}
        onScan={() => navigate("/scan")}
      />
    </DesignFrame>
  );
}

function DesignNotFound() {
  const navigate = useNavigate();
  return (
    <DesignFrame>
      <RouteError
        error={{ status: 404, statusText: "Not Found", data: null, internal: true }}
        onGoHome={() => navigate("/design")}
        onScan={() => navigate("/scan")}
      />
    </DesignFrame>
  );
}

/** /design and its specimens, only in development builds. */
export const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        ErrorBoundary: DesignShellError,
        children: [
          page("/design", async () => ({
            Component: (await import("@/pages/DesignPage")).DesignPage,
          })),
          page("/design/*", async () => ({ Component: DesignNotFound })),
        ],
      },
    ]
  : [];
