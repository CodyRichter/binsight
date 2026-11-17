import { chmodSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";
import base, { projects } from "./playwright.config";

const appAddress = "http://localhost:18001";
const dataDirectory = mkdtempSync(join(tmpdir(), "binsight-e2e-container-"));
// The container runs as uid 1000, which may not be the user running the tests.
chmodSync(dataDirectory, 0o777);

const signedIn = projects.find((project) => project.name === "signed in");

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: appAddress },
  projects: [
    ...projects.filter((project) => project.name !== "design"),
    { ...signedIn, name: "built", testIgnore: [], testMatch: "built.spec.ts" },
  ],
  webServer: {
    command: [
      "docker run --rm --name binsight-e2e --publish 18001:8000",
      `--env BINSIGHT_APP_ADDRESS=${appAddress} --volume ${dataDirectory}:/data`,
      "--read-only --tmpfs /tmp --init binsight-e2e",
    ].join(" "),
    url: `${appAddress}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    // docker run passes SIGTERM on to the container; the default SIGKILL would leave it running.
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
  },
});
