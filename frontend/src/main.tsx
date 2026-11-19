// Layered, so the app's own styles win over Mantine's whichever order the build loads them in.
import "@mantine/core/styles.layer.css";
import "@mantine/dates/styles.layer.css";
import "@mantine/notifications/styles.layer.css";
import "@/lib/theme/theme.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { createQueryClient } from "@/lib/api/queryClient";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";
import { router } from "@/routes";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

const queryClient = createQueryClient();

createRoot(root).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
