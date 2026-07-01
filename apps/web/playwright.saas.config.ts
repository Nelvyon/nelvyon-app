/**
 * Playwright configuration for the dedicated SaaS E2E suite.
 * Used by .github/workflows/playwright-saas.yml
 *
 * Runs only tests under e2e/saas/ with Chromium only.
 * Sets JWT_SECRET in the webServer env so middleware cookie checks pass
 * when tests set the nelvyon_token cookie.
 */
import { defineConfig, devices } from "@playwright/test";

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-for-playwright-saas-e2e";
/** Local Windows: use installed Google Chrome when bundled Chromium install fails. CI unchanged. */
const useSystemChrome = process.env.PLAYWRIGHT_CHANNEL === "chrome";

export default defineConfig({
  testDir: "./e2e/saas",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report-saas" }]]
    : [["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    ...devices["Desktop Chrome"],
    ...(useSystemChrome ? { channel: "chrome" as const } : { browserName: "chromium" as const }),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },

  expect: {
    timeout: 15_000,
  },

  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: true,
        timeout: 300_000,
        env: {
          JWT_SECRET: TEST_JWT_SECRET,
          NODE_ENV: "test",
          DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop",
        },
      },
});
