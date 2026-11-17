import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { createQueryClient } from "@/lib/api/queryClient";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";

/** Renders an element inside the app's theme, notifications, a fresh query cache and a router at the last of the given addresses, with a user to drive it. */
export function renderWithTheme(element: ReactElement, history: string[] = ["/"]) {
  const user = userEvent.setup();
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });
  function Providers({ children }: { children: ReactNode }) {
    return (
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
        <Notifications />
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={history} initialIndex={history.length - 1}>
            {children}
          </MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>
    );
  }
  return { ...render(element, { wrapper: Providers }), user };
}
