import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter, type RouteObject } from "react-router";
import { vi } from "vitest";
import { createQueryClient } from "@/lib/api/queryClient";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";

export const signedIn = { owner_exists: true, signed_in: true };

export function answer(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function renderRoutes(routeTree: RouteObject[], initialEntry: string) {
  const memoryRouter = createMemoryRouter(routeTree, { initialEntries: [initialEntry] });
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });
  const rendered = render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={memoryRouter} />
      </QueryClientProvider>
      <Notifications />
    </MantineProvider>,
  );
  return { ...rendered, router: memoryRouter };
}

/** Answers each API path with its own body, signed in. */
export function stubPaths(bodies: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) => {
      const route = path.split("?")[0];
      const known = {
        "/api/auth/status": signedIn,
        "/api/items/inbox/count": { count: 0 },
        // Every frame's navigation counts the views and pinned searches.
        "/api/views": { items: [], next_cursor: null },
        "/api/saved-searches": { items: [], next_cursor: null },
      };
      return Promise.resolve(answer(200, { ...known, ...bodies }[route]));
    }),
  );
}

export const site = {
  id: "home",
  name: "Home",
  type: "site",
  parent_id: null,
  summary: null,
  path: [{ id: "home", name: "Home" }],
  direct_item_count: 0,
  item_count: 1,
};
export const bin = {
  ...site,
  id: "cables",
  name: "Cables",
  type: "bin",
  parent_id: "home",
  path: [...site.path, { id: "cables", name: "Cables" }],
  direct_item_count: 1,
};
export const cable = {
  id: "hdmi",
  name: "HDMI cable",
  quantity: 3,
  home_location_id: "cables",
  path: bin.path,
  created_at: "2026-11-16T12:00:00Z",
};
