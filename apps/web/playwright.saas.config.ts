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
/**
 * Windows local: if `npx playwright install` fails (sandbox/AV), run:
 *   pnpm test:e2e:saas:win
 * Uses system Chrome via PLAYWRIGHT_CHANNEL=chrome (see playwright.saas.config.ts).
 */

export default defineConfig({
  testDir: "./e2e/saas",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  testIgnore: [/capture-marketing-shots\.spec\.ts/],
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

  webServer: process.env.CI || process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // Servidor de PRODUCCION, igual que CI (ver el paso
        // "Build Next.js for E2E (prod server — stable under load)" en
        // .github/workflows/playwright-saas.yml). Requiere `pnpm build` antes.
        //
        // Antes esto era `pnpm dev`. `next dev` compila las rutas bajo demanda,
        // asi que la suite —que navega a ~90 rutas distintas con varios workers—
        // disparaba compilaciones simultaneas: el servidor cortaba conexiones
        // (ERR_CONNECTION_RESET) y los `page.goto` agotaban los 60 s. El fallo
        // parecia aleatorio porque dependia de cuanto quedara en la cache de
        // `.next`, y desaparecia por completo tras un `pnpm build` (que la
        // sustituye por salida de produccion y obliga a recompilar todo).
        // Es decir: la suite local media el estado de una cache, no el producto.
        command: "pnpm start",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: true,
        timeout: 300_000,
        env: {
          JWT_SECRET: TEST_JWT_SECRET,
          // `server.js` cae a 8080 si no hay PORT (Railway lo inyecta). CI lo
          // fija a 3000; en local hacia falta lo mismo o el servidor levanta en
          // otro puerto y Playwright espera 300 s a un `/api/health` inexistente.
          PORT: "3000",
          NODE_ENV: "test",
          DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop",
          // Los 349 tests corren desde una sola IP con varios workers en menos
          // de dos minutos y cruzan el umbral de `public-api` (30/min): el
          // servidor cortaba conexiones y fallaba un test distinto en cada
          // ejecucion. Solo surte efecto fuera de produccion; ver la guarda en
          // `isRateLimitDisabledForTests`.
          RATE_LIMIT_DISABLED: "1",
        },
      },
});
