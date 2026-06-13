import { defineConfig, devices } from "@playwright/test";

const stagingBase =
  process.env.STAGING_WEB_URL?.trim() || "https://ideal-victory-staging.up.railway.app";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/staging-platform-flow.spec.ts",
  timeout: 120_000,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: stagingBase,
    ...devices["Desktop Chrome"],
    browserName: "chromium",
    trace: "on-first-retry",
  },
});
