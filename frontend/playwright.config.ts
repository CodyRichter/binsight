import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const inCi = Boolean(process.env.CI);
const appAddress = "http://localhost:5173";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: inCi,
  reporter: inCi ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: appAddress },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "uv run --directory ../backend --locked uvicorn app.main:create_app --factory --port 8000",
      url: "http://localhost:8000/api/health",
      reuseExistingServer: !inCi,
      env: {
        BINSIGHT_APP_ADDRESS: appAddress,
        // Every run starts from an empty data directory, as a fresh install does.
        BINSIGHT_DATA_DIRECTORY: mkdtempSync(join(tmpdir(), "binsight-e2e-")),
      },
    },
    {
      command: "npm run dev -- --port 5173 --strictPort",
      url: `${appAddress}/design`,
      reuseExistingServer: !inCi,
    },
  ],
});
