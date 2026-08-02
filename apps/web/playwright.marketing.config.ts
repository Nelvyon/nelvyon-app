import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3012";

/**
 * Marketing e2e contra servidor YA levantado.
 * Sin webServer/build — evita bloqueos de 10+ minutos.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/marketing.spec.ts"],
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    channel: "msedge",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
});
