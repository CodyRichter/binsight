import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter, type RouteObject } from "react-router";
import { vi } from "vitest";
import { createQueryClient } from "@/lib/api/queryClient";
import type { AuthStatus } from "@/lib/api/useAuthStatus";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";

/** Signed in as an admin, who may do everything. */
export const signedIn = {
  setup_needed: false,
  account: { id: "sam", username: "sam", role: "admin" },
} satisfies AuthStatus;

/** Signed in with a role, for a page as that account sees it. */
export function signedInAs(role: "viewer" | "editor" | "admin") {
  return { ...signedIn, account: { ...signedIn.account, role } } satisfies AuthStatus;
}

/** Not signed in: the home read-only. */
export const visitor = { setup_needed: false, account: null } satisfies AuthStatus;

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
/** Answers each path with its body, or with the Response given for it, such as a 404. */
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
      const body: unknown = { ...known, ...bodies }[route];
      return Promise.resolve(body instanceof Response ? body.clone() : answer(200, body));
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
