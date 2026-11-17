import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter, type RouteObject } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { DesignFrame } from "@/features/design";
import { ApiError } from "@/lib/api/client";
import { createQueryClient } from "@/lib/api/queryClient";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";
import { routes } from "./routes";

afterEach(() => {
  vi.unstubAllGlobals();
});

function answer(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const signedIn = { owner_exists: true, signed_in: true };
const signedOut = { owner_exists: true, signed_in: false };
const newInstall = { owner_exists: false, signed_in: false };

/** Answers each request in turn; the last answer is repeated for any request after it. */
function stubBackend(...answers: (Response | Error)[]) {
  let next = 0;
  const fetchMock = vi.fn(() => {
    const given = answers[Math.min(next++, answers.length - 1)];
    if (given instanceof Error) return Promise.reject(given);
    return Promise.resolve(given.clone());
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function BrokenContent(): React.JSX.Element {
  throw new ApiError(500, "internal", "Database failed.");
}

function PageWithBrokenChild() {
  return (
    <DesignFrame>
      <BrokenContent />
    </DesignFrame>
  );
}

function renderRoutes(routeTree: RouteObject[], initialEntry: string) {
  const memoryRouter = createMemoryRouter(routeTree, { initialEntries: [initialEntry] });
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });
  return render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={memoryRouter} />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

test("signed in, an unmatched route keeps the outer frame around the 404 message", async () => {
  stubBackend(answer(200, signedIn));
  renderRoutes(routes, "/does-not-exist");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
});

test("render error inside Frame stays inside #content while keeping the outer frame mounted", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const [root] = routes;
  const devGroup = root.children?.[0];
  const withBroken: RouteObject[] = [
    {
      Component: root.Component,
      ErrorBoundary: root.ErrorBoundary,
      children: devGroup
        ? [
            {
              ErrorBoundary: devGroup.ErrorBoundary,
              children: [{ path: "/design/broken", Component: PageWithBrokenChild }],
            },
          ]
        : [],
    },
  ];
  renderRoutes(withBroken, "/design/broken");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Something went wrong" }),
  ).toBeVisible();
  expect(screen.getByText("Database failed.")).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
  consoleError.mockRestore();
});

test("an unreachable backend says so inside the frame, and Try again recovers", async () => {
  stubBackend(new TypeError("Failed to fetch"), answer(200, signedIn));
  renderRoutes(routes, "/does-not-exist");
  expect(await screen.findByText("Can't reach Binsight")).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(
    await screen.findByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
  expect(screen.queryByText("Can't reach Binsight")).not.toBeInTheDocument();
});

test("a failure on the backend shows Something went wrong inside the frame", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  stubBackend(
    answer(500, { error: { code: "internal", message: "Database failed.", details: {} } }),
  );
  renderRoutes(routes, "/does-not-exist");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Something went wrong" }),
  ).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  consoleError.mockRestore();
});

test("signed out, a page sends you to the Gate with one password field", async () => {
  stubBackend(answer(200, signedOut));
  renderRoutes(routes, "/settings");
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeVisible();
  expect(screen.getAllByLabelText(/password/i)).toHaveLength(1);
  expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
});

test("a new install asks for the password twice", async () => {
  stubBackend(answer(200, newInstall));
  renderRoutes(routes, "/settings");
  expect(await screen.findByRole("button", { name: "Set password" })).toBeVisible();
  expect(screen.getByLabelText("Password")).toBeVisible();
  expect(screen.getByLabelText("Repeat password")).toBeVisible();
});

test("signing in returns to the address that was asked for", async () => {
  let signedInNow = false;
  const fetchMock = vi.fn((path: string) => {
    if (path === "/api/auth/sign-in") signedInNow = true;
    return Promise.resolve(answer(200, signedInNow ? signedIn : signedOut));
  });
  vi.stubGlobal("fetch", fetchMock);
  renderRoutes(routes, "/settings");
  await userEvent.type(await screen.findByLabelText("Password"), "correct horse");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith("/api/auth/sign-in", expect.anything());
});

test("a wrong password shows the backend's sentence and stays on the Gate", async () => {
  stubBackend(
    answer(200, signedOut),
    answer(401, {
      error: { code: "wrong_password", message: "That password is wrong. Try again.", details: {} },
    }),
  );
  renderRoutes(routes, "/login");
  await userEvent.type(await screen.findByLabelText("Password"), "wrong horse");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("That password is wrong. Try again.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("passwords that differ are caught before anything is sent", async () => {
  const fetchMock = stubBackend(answer(200, newInstall));
  renderRoutes(routes, "/login");
  await userEvent.type(await screen.findByLabelText("Password"), "correct horse");
  await userEvent.type(screen.getByLabelText("Repeat password"), "correct hose");
  await userEvent.click(screen.getByRole("button", { name: "Set password" }));
  expect(await screen.findByText("The passwords differ. Type them again.")).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("signing out sends the page to the Gate, ready to return to it", async () => {
  let signedInNow = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) => {
      if (path === "/api/auth/sign-out") {
        signedInNow = false;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(answer(200, signedInNow ? signedIn : signedOut));
    }),
  );
  renderRoutes(routes, "/settings");
  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeVisible();
  expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
});

const site = {
  id: "home",
  name: "Home",
  type: "site",
  parent_id: null,
  summary: null,
  path: [{ id: "home", name: "Home" }],
  direct_item_count: 0,
  item_count: 1,
};
const bin = {
  ...site,
  id: "cables",
  name: "Cables",
  type: "bin",
  parent_id: "home",
  path: [...site.path, { id: "cables", name: "Cables" }],
  direct_item_count: 1,
};
const cable = {
  id: "hdmi",
  name: "HDMI cable",
  quantity: 3,
  home_location_id: "cables",
  path: bin.path,
  created_at: "2026-11-16T12:00:00Z",
};
const added = { id: "e1", at: "2026-11-16T12:00:00Z", actor: "app", action: "item.created" };

/** Answers each API path with its own body, signed in. */
function stubPaths(bodies: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) => {
      const route = path.split("?")[0];
      return Promise.resolve(answer(200, route === "/api/auth/status" ? signedIn : bodies[route]));
    }),
  );
}

test("/ shows the sites as a tree under Locations", async () => {
  stubPaths({ "/api/locations": { locations: [site, bin] } });
  renderRoutes(routes, "/");
  expect(await screen.findByRole("heading", { level: 1, name: "Locations" })).toBeVisible();
  expect(screen.getByText("1 site")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Expand Home" }));
  expect(screen.getByRole("link", { name: "Cables" })).toBeVisible();
});

test("/locations/{id} shows the location's items", async () => {
  stubPaths({
    "/api/locations": { locations: [site, bin] },
    "/api/items": { items: [cable], next_cursor: null },
  });
  renderRoutes(routes, "/locations/cables");
  expect(await screen.findByRole("heading", { level: 1, name: "Cables" })).toBeVisible();
  expect(await screen.findByRole("link", { name: "HDMI cable" })).toBeVisible();
});

test("/locations/{id} for a location that does not exist says so", async () => {
  stubPaths({ "/api/locations": { locations: [site] } });
  renderRoutes(routes, "/locations/made-up");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nothing at this address" }),
  ).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
});

test("/items/{id} shows the item's path, quantity and history", async () => {
  stubPaths({
    "/api/items/hdmi": cable,
    "/api/history": { items: [{ ...added, changes: [] }], next_cursor: null },
  });
  renderRoutes(routes, "/items/hdmi");
  expect(await screen.findByRole("heading", { level: 1, name: "HDMI cable" })).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Path" })).toHaveTextContent("HomeCables");
  expect(screen.getByRole("button", { name: "Quantity 3, type a number" })).toBeVisible();
  expect(await screen.findByText("Added")).toBeVisible();
});
