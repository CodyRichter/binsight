import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { createQueryClient } from "@/lib/api/queryClient";
import { stubPaths } from "@/lib/testing/routeTesting";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";
import { AppFrame } from "./AppFrame";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("Back from search returns to where it began, even when typing outruns the page loading", async () => {
  stubPaths({});
  let showResults = () => {};
  const resultsLoaded = new Promise<void>((resolve) => (showResults = resolve));
  const router = createMemoryRouter(
    [
      { path: "/", element: <AppFrame>Start</AppFrame> },
      { path: "/bin", element: <AppFrame>Bin</AppFrame> },
      {
        path: "/search",
        lazy: async () => {
          await resultsLoaded;
          return { element: <AppFrame>Results</AppFrame> };
        },
      },
    ],
    { initialEntries: ["/", "/bin"], initialIndex: 1 },
  );
  render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  );
  await userEvent.type(await screen.findByRole("searchbox", { name: "Search" }), "cab");
  showResults();
  await waitFor(() => expect(router.state.location.search).toBe("?q=cab"));
  await act(() => router.navigate(-1));
  await waitFor(() => expect(router.state.location.pathname).toBe("/bin"));
});
