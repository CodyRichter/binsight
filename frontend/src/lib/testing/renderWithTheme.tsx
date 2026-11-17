import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";

/** Renders an element inside the app's theme, notifications and a router at the last of the given addresses, with a user to drive it. */
export function renderWithTheme(element: ReactElement, history: string[] = ["/"]) {
  const user = userEvent.setup();
  function Providers({ children }: { children: ReactNode }) {
    return (
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
        <Notifications />
        <MemoryRouter initialEntries={history} initialIndex={history.length - 1}>
          {children}
        </MemoryRouter>
      </MantineProvider>
    );
  }
  return { ...render(element, { wrapper: Providers }), user };
}
