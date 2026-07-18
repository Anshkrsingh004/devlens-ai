import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

/**
 * End-to-end test configuration.
 *
 * Playwright starts the dev server itself, so `npm run test:e2e` works from a
 * clean checkout with no separate build step. Locally an already-running
 * server is reused; in CI a fresh one is always started.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});
