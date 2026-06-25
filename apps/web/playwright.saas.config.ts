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

export default defineConfig({
  testDir: "./e2e/saas",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report-saas" }]]
    : [["list"]],

  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
    browserName: "chromium",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      JWT_SECRET: TEST_JWT_SECRET,
      NODE_ENV: "test",
      // DATABASE_URL intentionally empty — all DB calls mocked via page.route()
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop",
    },
  },
});
