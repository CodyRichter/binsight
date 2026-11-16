import { defineConfig, devices } from "@playwright/test";

const inCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  // Font rendering differs by machine, so screenshots are compared and made only in the CI container.
  ignoreSnapshots: !inCi,
  updateSnapshots: "none",
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
