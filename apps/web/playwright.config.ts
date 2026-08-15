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
          /**
         * 20 min, no 10. Medido sobre el fallo real en CI (run 31875550350):
         *
         *     09:00:49  arranca el paso
         *     09:06:58  "Compiled with warnings in 6.1min"
         *     09:08:16  seguia generando estatico ("Using edge runtime...")
         *     09:10:51  timeout, exactamente a los 600000 ms
         *
         * El build NO estaba colgado: progresaba. No habia puerto ocupado, ni
         * proceso zombi, ni error de arranque — solo un `next build` en frio de
         * este monorepo en un runner de 2 nucleos, justo por encima del limite.
         * Por eso unas corridas pasaban y otras no.
         *
         * Esto no oculta fallos: si el servidor nunca llega a responder,
         * Playwright sigue fallando, solo que despues de darle tiempo real. Lo
         * que se elimina es el falso negativo por cronometro.
         */
        timeout: 1_200_000,
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
