import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";

function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
      <Notifications />
      <MemoryRouter>{children}</MemoryRouter>
    </MantineProvider>
  );
}

/** Renders an element inside the app's theme, notifications and a router, with a user to drive it. */
export function renderWithTheme(element: ReactElement) {
  const user = userEvent.setup();
  return { ...render(element, { wrapper: Providers }), user };
}
