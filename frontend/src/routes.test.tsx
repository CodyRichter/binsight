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

function healthAnswer(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubBackend(...answers: (Response | Error)[]) {
  const fetchMock = vi.fn();
  for (const answer of answers) {
    if (answer instanceof Error) fetchMock.mockRejectedValueOnce(answer);
    else fetchMock.mockResolvedValueOnce(answer);
  }
  vi.stubGlobal("fetch", fetchMock);
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

test("unmatched route keeps the outer frame around the 404 message", async () => {
  stubBackend(healthAnswer(200, { status: "ok" }));
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
  stubBackend(new TypeError("Failed to fetch"), healthAnswer(200, { status: "ok" }));
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
    healthAnswer(500, { error: { code: "internal", message: "Database failed.", details: {} } }),
  );
  renderRoutes(routes, "/does-not-exist");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Something went wrong" }),
  ).toBeVisible();
  expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  consoleError.mockRestore();
});
