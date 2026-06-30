/**
 * S51 — E2E: Sector Benchmark
 */
import { expect, test } from "@playwright/test";
import { setAuthCookie, mockSaasApis, mockSectorBenchmark, expectUnauthorizedApi } from "./fixtures";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function gotoBenchmark(page: import("@playwright/test").Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await gotoBenchmark(page);
      await page.waitForResponse("**/api/saas/benchmark**", { timeout: 15_000 });
      return;
    } catch (err) {
      if (attempt === 2) throw err;
      await page.waitForTimeout(800 * (attempt + 1));
    }
  }
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
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
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
    await expect(page.getByText("Tasa de apertura email")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("ROAS publicidad")).toBeVisible();
  });

  test("data sources footer visible", async ({ page }) => {
    await gotoBenchmark(page);
    await expect(page.getByText(/Fuentes:/)).toBeVisible();
  });

  test("Actualizar triggers refresh", async ({ page }) => {
    await gotoBenchmark(page);
    await page.getByRole("button", { name: /Actualizar/i }).click();
    await page.waitForResponse("**/api/saas/benchmark/refresh**", { timeout: 15_000 });
    await expect(page.getByText(/Benchmark actualizado|Puntuación global/)).toBeVisible({ timeout: 10_000 });
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
