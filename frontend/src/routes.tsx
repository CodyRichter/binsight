import { createBrowserRouter, type RouteObject } from "react-router";

const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: "/design",
        lazy: async () => ({ Component: (await import("@/pages/DesignPage")).DesignPage }),
      },
    ]
  : [];

export const router = createBrowserRouter([...developmentRoutes]);
