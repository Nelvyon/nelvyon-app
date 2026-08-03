import { defineConfig, devices } from "@playwright/test";

/** Local Windows: use installed Google Chrome when bundled Chromium is unavailable. */
const useSystemChrome = process.env.PLAYWRIGHT_CHANNEL === "chrome";
const TEST_JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-for-playwright-e2e-min-32-chars";
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop";

/**
 * Servidor bajo prueba.
 *
 * Sin `PLAYWRIGHT_BASE_URL` el comportamiento es el de siempre: Playwright
 * levanta su propio servidor en :3000 (y lo reutiliza si ya responde).
 *
 * Con `PLAYWRIGHT_BASE_URL` se asume un servidor externo ya en marcha y NO se
 * declara `webServer`. Antes se declaraba igualmente, de modo que Playwright
 * arrancaba `pnpm build && pnpm start` en :3000 y ese build reescribia `.next`
 * por debajo del proceso que estuviera sirviendo la app: los chunks estaticos
 * pasaban a devolver 400 a mitad de la ejecucion.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const USA_SERVIDOR_EXTERNO = Boolean(process.env.PLAYWRIGHT_BASE_URL);

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
        baseURL: BASE_URL,
        ...devices["Desktop Chrome"],
        ...(useSystemChrome ? { channel: "chrome" as const } : { browserName: "chromium" as const }),
        navigationTimeout: 60_000,
      },
    },
  ],
  use: {
    baseURL: BASE_URL,
    ...devices["Desktop Chrome"],
    ...(useSystemChrome ? { channel: "chrome" as const } : { browserName: "chromium" as const }),
  },
  ...(USA_SERVIDOR_EXTERNO
    ? {}
    : {
        webServer: {
          command: "pnpm build && pnpm start",
          url: BASE_URL,
          // Fuera de CI se reutiliza el servidor que ya responda en esa URL,
          // de modo que no se relanza `pnpm build` sobre un `.next` en uso.
          reuseExistingServer: !process.env.CI,
          timeout: 600_000,
          env: {
            JWT_SECRET: TEST_JWT_SECRET,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? TEST_JWT_SECRET,
            TRACKING_SECRET: process.env.TRACKING_SECRET ?? TEST_JWT_SECRET,
            CRON_SECRET: process.env.CRON_SECRET ?? TEST_JWT_SECRET,
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? BASE_URL,
            DATABASE_URL: TEST_DATABASE_URL,
            NODE_ENV: "test",
            PORT: "3000",
          },
        },
      }),
});
