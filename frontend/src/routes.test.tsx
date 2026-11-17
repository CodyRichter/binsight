import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter, type RouteObject } from "react-router";
import { expect, test, vi } from "vitest";
import { DesignFrame } from "@/features/design";
import { ApiError } from "@/lib/api/client";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";
import { routes } from "./routes";

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
  return render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <RouterProvider router={memoryRouter} />
    </MantineProvider>,
  );
}

test("unmatched route keeps the outer frame around the 404 message", async () => {
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
