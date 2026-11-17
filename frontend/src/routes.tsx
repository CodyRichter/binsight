import {
  Outlet,
  ScrollRestoration,
  createBrowserRouter,
  useNavigate,
  useRouteError,
  type RouteObject,
} from "react-router";
import { RouteError } from "@/components/RouteError";
import { DesignFrame } from "@/features/design";

function page(path: string, load: () => Promise<{ Component: () => React.JSX.Element }>) {
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
        onScan={() => navigate("/design/task")}
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
        onScan={() => navigate("/design/task")}
      />
    </DesignFrame>
  );
}

function RootError() {
  const error = useRouteError();
  return (
    <main id="content">
      <RouteError
        error={error}
        onRetry={() => window.location.reload()}
        onGoHome={() => {
          window.location.assign(import.meta.env.DEV ? "/design" : "/");
        }}
      />
    </main>
  );
}

const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        ErrorBoundary: DesignShellError,
        children: [
          page("/design", async () => ({
            Component: (await import("@/pages/DesignPage")).DesignPage,
          })),
          page("/design/browse/:location?", async () => ({
            Component: (await import("@/pages/DesignBrowsePage")).DesignBrowsePage,
          })),
          page("/design/list", async () => ({
            Component: (await import("@/pages/DesignListPage")).DesignListPage,
          })),
          page("/design/record/:item?", async () => ({
            Component: (await import("@/pages/DesignRecordPage")).DesignRecordPage,
          })),
          page("/design/task", async () => ({
            Component: (await import("@/pages/DesignTaskPage")).DesignTaskPage,
          })),
          page("/design/settings", async () => ({
            Component: (await import("@/pages/DesignSettingsPage")).DesignSettingsPage,
          })),
          page("/design/gate", async () => ({
            Component: (await import("@/pages/DesignGatePage")).DesignGatePage,
          })),
          page("*", async () => ({ Component: DesignNotFound })),
        ],
      },
    ]
  : [];

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export const routes: RouteObject[] = [
  { Component: Root, ErrorBoundary: RootError, children: developmentRoutes },
];

export const router = createBrowserRouter(routes);
