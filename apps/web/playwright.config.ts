import { defineConfig, devices } from "@playwright/test";

/** Local Windows: use installed Google Chrome when bundled Chromium is unavailable. */
const useSystemChrome = process.env.PLAYWRIGHT_CHANNEL === "chrome";
const TEST_JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-for-playwright-e2e-min-32-chars";
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/staging-platform-flow.spec.ts"],
  timeout: 60_000,
  retries: 1,
  reporter: "list",
  projects: [
    {
      name: "chromium",
      use: {
        baseURL: "http://localhost:3000",
        ...devices["Desktop Chrome"],
        ...(useSystemChrome ? { channel: "chrome" as const } : { browserName: "chromium" as const }),
        navigationTimeout: 60_000,
      },
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
    ...(useSystemChrome ? { channel: "chrome" as const } : { browserName: "chromium" as const }),
  },
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    env: {
      JWT_SECRET: TEST_JWT_SECRET,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? TEST_JWT_SECRET,
      TRACKING_SECRET: process.env.TRACKING_SECRET ?? TEST_JWT_SECRET,
      CRON_SECRET: process.env.CRON_SECRET ?? TEST_JWT_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: "test",
      PORT: "3000",
    },
  },
});
