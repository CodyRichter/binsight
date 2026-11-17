import {
  Outlet,
  ScrollRestoration,
  createBrowserRouter,
  useNavigate,
  useRouteError,
  type RouteObject,
} from "react-router";
import { AppFrame } from "@/components/AppFrame";
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

function AppError() {
  const error = useRouteError();
  const navigate = useNavigate();
  return (
    <AppFrame>
      <RouteError error={error} onRetry={() => navigate(0)} onGoHome={() => navigate("/")} />
    </AppFrame>
  );
}

function AppNotFound() {
  const navigate = useNavigate();
  return (
    <AppFrame>
      <RouteError
        error={{ status: 404, statusText: "Not Found", data: null, internal: true }}
        onGoHome={() => navigate("/")}
      />
    </AppFrame>
  );
}

function RootError() {
  const error = useRouteError();
  return (
    <main id="content">
      <RouteError
        error={error}
        onRetry={() => window.location.reload()}
        onGoHome={() => window.location.assign("/")}
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
          page("/design/list", async () => ({
            Component: (await import("@/pages/DesignListPage")).DesignListPage,
          })),
          page("/design/task", async () => ({
            Component: (await import("@/pages/DesignTaskPage")).DesignTaskPage,
          })),
          page("/design/*", async () => ({ Component: DesignNotFound })),
        ],
      },
    ]
  : [];

const appRoutes: RouteObject[] = [
  {
    ErrorBoundary: AppError,
    children: [
      page("/", async () => ({ Component: (await import("@/pages/HomePage")).HomePage })),
      page("/locations/:id", async () => ({
        Component: (await import("@/pages/LocationPage")).LocationPage,
      })),
      page("/items/:id", async () => ({ Component: (await import("@/pages/ItemPage")).ItemPage })),
      page("/login", async () => ({ Component: (await import("@/pages/LoginPage")).LoginPage })),
      page("/settings", async () => ({
        Component: (await import("@/pages/SettingsPage")).SettingsPage,
      })),
      { path: "*", Component: AppNotFound },
    ],
  },
];

// Pages load on first visit; until then the ground shows, as on any first load.
function NothingYet() {
  return null;
}

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export const routes: RouteObject[] = [
  {
    Component: Root,
    HydrateFallback: NothingYet,
    ErrorBoundary: RootError,
    children: [...developmentRoutes, ...appRoutes],
  },
];

export const router = createBrowserRouter(routes);
