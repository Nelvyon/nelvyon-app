import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 1,
  reporter: "list",
  projects: [
    {
      name: "chromium",
      use: {
        baseURL: "http://localhost:3000",
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        navigationTimeout: 60_000,
      },
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
    browserName: "chromium",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
