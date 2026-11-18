import {
  Outlet,
  ScrollRestoration,
  createBrowserRouter,
  useNavigate,
  useRouteError,
  type RouteObject,
} from "react-router";
import { AppFrame } from "@/components/AppFrame";
import { FrameAdditionsContext, type FrameAdditions } from "@/components/frameAdditions";
import { RouteError } from "@/components/RouteError";
import { developmentRoutes, page } from "@/developmentRoutes";
import { useInboxCount } from "@/features/items";
import { AddSheet, MoveSheet } from "@/features/locations";
import { useViewsSection } from "@/features/views";

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

const frameAdditions: FrameAdditions = { AddSheet, MoveSheet, useInboxCount, useViewsSection };

function AppPages() {
  return (
    <FrameAdditionsContext.Provider value={frameAdditions}>
      <Outlet />
    </FrameAdditionsContext.Provider>
  );
}

const appRoutes: RouteObject[] = [
  {
    Component: AppPages,
    ErrorBoundary: AppError,
    children: [
      page("/", async () => ({ Component: (await import("@/pages/HomePage")).HomePage })),
      page("/l/:code", async () => ({
        Component: (await import("@/pages/LabelPage")).LabelPage,
      })),
      page("/locations/:id", async () => ({
        Component: (await import("@/pages/LocationPage")).LocationPage,
      })),
      page("/locations/:id/sheet", async () => ({
        Component: (await import("@/pages/ContentsSheetPage")).ContentsSheetPage,
      })),
      ...["/insurance", "/locations/:id/insurance"].map((path) =>
        page(path, async () => ({
          Component: (await import("@/pages/InsurancePage")).InsurancePage,
        })),
      ),
      page("/items/:id", async () => ({ Component: (await import("@/pages/ItemPage")).ItemPage })),
      page("/views", async () => ({ Component: (await import("@/pages/ViewsPage")).ViewsPage })),
      page("/views/:view", async () => ({
        Component: (await import("@/pages/ViewPage")).ViewPage,
      })),
      page("/inbox", async () => ({ Component: (await import("@/pages/InboxPage")).InboxPage })),
      page("/search", async () => ({ Component: (await import("@/pages/SearchPage")).SearchPage })),
      page("/scan", async () => ({ Component: (await import("@/pages/ScanPage")).ScanPage })),
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
