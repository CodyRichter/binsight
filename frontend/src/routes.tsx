import { Outlet, ScrollRestoration, createBrowserRouter, type RouteObject } from "react-router";

function page(path: string, load: () => Promise<{ Component: () => React.JSX.Element }>) {
  return { path, lazy: load };
}

const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      page("/design", async () => ({ Component: (await import("@/pages/DesignPage")).DesignPage })),
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

export const router = createBrowserRouter([{ Component: Root, children: developmentRoutes }]);
