import { defineConfig, devices } from "@playwright/test";

const inCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  forbidOnly: inCi,
  reporter: inCi ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:5173" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173/design",
    reuseExistingServer: !inCi,
  },
});
