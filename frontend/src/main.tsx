import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/lib/theme/theme.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { cssVariablesResolver, theme } from "@/lib/theme/theme";
import { router } from "@/routes";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

createRoot(root).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <Notifications />
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
