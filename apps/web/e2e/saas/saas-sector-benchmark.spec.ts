/**
 * S51 — E2E: Sector Benchmark
 */
import { expect, test } from "@playwright/test";
import { setAuthCookie, mockSaasApis, mockSectorBenchmark, expectUnauthorizedApi, gotoAwaitingApi, waitForStreamSettled } from "./fixtures";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function gotoBenchmark(page: import("@playwright/test").Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await gotoAwaitingApi(page, "/saas/benchmark", "/api/saas/benchmark");
    if (res) {
      // Mientras React esta transmitiendo, el contenido existe DOS veces: en su
      // sitio y en el contenedor temporal `body > div[id^='S:']`. Medido aqui en
      // 2 de cada 20 cargas, con las dos rutas al mismo `h5.bc-title`:
      //   body > main > … > h5.bc-title
      //   body > div#S:1[hidden] > … > h5.bc-title
      // Playwright NO reintenta las violaciones de modo estricto, asi que un
      // assert inmediato veia 2 elementos y fallaba. Esto no afloja nada: es una
      // espera de DOM pura, sin red, sin reintentos y sin ampliar timeouts.
      await waitForStreamSettled(page);
      return;
    }
    if (attempt === 2) throw new Error("benchmark API response not received");
    await page.waitForTimeout(800 * (attempt + 1));
  }
}

/**
 * Errores de hidratacion de React, que este test tolera a proposito.
 *
 * En produccion React minifica los mensajes: en vez de "Hydration failed..."
 * emite "Minified React error #418". El filtro anterior descartaba solo por la
 * palabra "hydration", asi que NO reconocia esos codigos y un mismatch real
 * hacia fallar el test con un mensaje opaco e imposible de diagnosticar.
 *
 * Se reconocen los dos codigos que corresponden de verdad a hidratacion: #418
 * (el HTML del servidor no coincide con el del cliente) y #423 (error al
 * hidratar, React recurre a render en cliente). No se ignora ningun otro error
 * de React: un TypeError o un #185 siguen haciendo fallar el test.
 */
function esErrorDeHidratacion(mensaje: string): boolean {
  if (/hydration/i.test(mensaje)) return true;
  return /Minified React error #(418|423)/.test(mensaje);
}

test.describe("S51 — /saas/benchmark page", () => {
  test.beforeEach(async ({ context, page }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await mockSectorBenchmark(page);
  });

  test("page loads without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await gotoBenchmark(page);
    expect(errors.filter((e) => !esErrorDeHidratacion(e))).toHaveLength(0);
  });

  test("header and sector badge visible", async ({ page }) => {
    await gotoBenchmark(page);
    await expect(page.getByText("Sector Benchmark")).toBeVisible();
    await expect(page.getByText("E-commerce")).toBeVisible();
  });

  test("Actualizar button visible", async ({ page }) => {
    await gotoBenchmark(page);
    await expect(page.getByRole("button", { name: /Actualizar/i })).toBeVisible();
  });

  test("summary KPIs render the overall score", async ({ page }) => {
    await gotoBenchmark(page);
    await expect(page.getByText("Puntuación global")).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();
  });

  test("comparison table lists metric labels", async ({ page }) => {
    await gotoBenchmark(page);
    await expect(page.getByRole("cell", { name: "Tasa de apertura email" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("cell", { name: "ROAS publicidad" })).toBeVisible();
  });

  test("data sources footer visible", async ({ page }) => {
    await gotoBenchmark(page);
    await expect(page.getByText(/Fuentes:/)).toBeVisible();
  });

  test("Actualizar triggers refresh", async ({ page }) => {
    await gotoBenchmark(page);
    const refreshResponse = page.waitForResponse(
      res => res.url().includes("/api/saas/benchmark/refresh") && res.request().method() === "POST",
      { timeout: 15_000 },
    );
    await page.getByRole("button", { name: /Actualizar/i }).click();
    await refreshResponse;
    await expect(page.getByText("Benchmark actualizado", { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("S51 — Benchmark API auth", () => {
  test("GET /api/saas/benchmark requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, `${BASE}/api/saas/benchmark`);
  });

  test("POST /api/saas/benchmark/refresh requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, `${BASE}/api/saas/benchmark/refresh`, "POST", {});
  });

  test("GET /api/saas/benchmarks/sectors requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, `${BASE}/api/saas/benchmarks/sectors`);
  });

  test("POST /api/saas/benchmarks/compare requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, `${BASE}/api/saas/benchmarks/compare`, "POST", {});
  });
});
