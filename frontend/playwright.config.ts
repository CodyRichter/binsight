import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices, type Project } from "@playwright/test";
import { signedInState } from "./e2e/owner";

const inCi = Boolean(process.env.CI);
const appAddress = "http://localhost:5173";

const signedIn = { ...devices["Desktop Chrome"], storageState: signedInState };

export const projects: Project[] = [
  { name: "owner", testMatch: "auth.setup.ts", use: devices["Desktop Chrome"] },
  {
    name: "signed out",
    testMatch: "auth.spec.ts",
    use: devices["Desktop Chrome"],
    dependencies: ["owner"],
  },
  {
    name: "signed in",
    testIgnore: [
      "auth.setup.ts",
      "auth.spec.ts",
      "design.spec.ts",
      "designSpacing.spec.ts",
      "built.spec.ts",
    ],
    use: signedIn,
    dependencies: ["owner"],
  },
  // Development builds only, so the container run leaves them out.
  {
    name: "design",
    testMatch: ["design.spec.ts", "designSpacing.spec.ts"],
    use: signedIn,
    dependencies: ["owner"],
  },
];

export default defineConfig({
  testDir: "e2e",
  forbidOnly: inCi,
  reporter: inCi ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: appAddress },
  projects,
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
