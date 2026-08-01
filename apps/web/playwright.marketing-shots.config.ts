/**
 * Playwright config for marketing SaaS UI screenshots.
 * Does not run in CI by default — local / ops only.
 */
import { defineConfig, devices } from "@playwright/test";

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-for-playwright-saas-e2e";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3010";
const useSystemChrome = process.env.PLAYWRIGHT_CHANNEL === "chrome";

export default defineConfig({
  testDir: "./e2e/saas",
  testMatch: /capture-marketing-shots\.spec\.ts/,
  timeout: 600_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    ...(useSystemChrome ? { channel: "chrome" as const } : { browserName: "chromium" as const }),
    trace: "off",
    screenshot: "off",
    video: "off",
    navigationTimeout: 90_000,
    actionTimeout: 30_000,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "cross-env PORT=3010 pnpm dev",
        url: "http://127.0.0.1:3010/api/health",
        reuseExistingServer: true,
        timeout: 300_000,
        env: {
          JWT_SECRET: TEST_JWT_SECRET,
          PORT: "3010",
          NODE_ENV: "development",
          DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop",
        },
      },
});
