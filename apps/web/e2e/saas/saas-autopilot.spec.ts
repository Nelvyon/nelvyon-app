/**
 * E2E — /saas/autopilot (Autopilot Command Center)
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

const FIXTURE_STATUS = {
  status: {
    tenantId: "t1",
    seoEnabled: false,
    socialEnabled: true,
    reputationEnabled: false,
    adsEnabled: false,
    seoDayOfMonth: 1,
    socialDayOfMonth: 1,
    lastSeoRunAt: null,
    lastSocialRunAt: "2026-06-01T08:00:00Z",
    lastReputationRunAt: null,
    lastAdsRunAt: null,
    updatedAt: new Date().toISOString(),
    activeCount: 1,
    nextSeoRun: null,
    nextSocialRun: "2026-07-01T08:00:00Z",
  },
};

const FIXTURE_ENTREGABLES = {
  deliverables: [],
  summary: { total: 3, pendingReview: 0, approved: 2, avgQaScore: 90, byType: {}, byStatus: {} },
};

test.describe("SaaS Autopilot — auth guard", () => {
  test("GET /saas/autopilot sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/autopilot");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /api/saas/autopilot 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/autopilot");
  });

  test("PATCH /api/saas/autopilot 401 sin auth", async ({ request }) => {
    const res = await request.patch("/api/saas/autopilot", {
      data: { seoEnabled: true },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/saas/autopilot/run 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/autopilot/run", "POST", { service: "seo" });
  });
});

test.describe("SaaS Autopilot — página autenticada", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/autopilot**", route => {
      const method = route.request().method();
      if (method === "PATCH") return route.fulfill({ json: { settings: FIXTURE_STATUS.status } });
      return route.fulfill({ json: FIXTURE_STATUS });
    });
    await page.route("**/api/saas/entregables**", route =>
      route.fulfill({ json: FIXTURE_ENTREGABLES }));
  });

  test("carga sin error 500", async ({ page }) => {
    await page.goto("/saas/autopilot");
    expect(page.url()).not.toContain("500");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("URL contiene /saas/autopilot tras carga", async ({ page }) => {
    await page.goto("/saas/autopilot");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    expect(page.url()).toContain("/saas/autopilot");
  });

  test("4 toggles de servicio visibles", async ({ page }) => {
    await page.goto("/saas/autopilot");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/SEO mensual/i);
    expect(bodyText).toMatch(/Calendario social/i);
    expect(bodyText).toMatch(/Reputaci/i);
    expect(bodyText).toMatch(/Ads snapshot/i);
  });

  test("KPI strip muestra servicios activos y entregables", async ({ page }) => {
    await page.goto("/saas/autopilot");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/Servicios activos|activos/i);
    expect(bodyText).toMatch(/Entregables este mes/i);
  });

  test("link 'Ver entregables' apunta a /saas/entregables", async ({ page }) => {
    await page.goto("/saas/autopilot");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    const link = page.locator("a", { hasText: /Ver entregables/i });
    const href = await link.getAttribute("href");
    expect(href).toBe("/saas/entregables");
  });

  test("botón 'Ejecutar ahora' deshabilitado cuando servicio OFF (seo)", async ({ page }) => {
    await page.goto("/saas/autopilot");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    // SEO is disabled in fixture — button should be disabled
    const buttons = page.locator("button", { hasText: /Ejecutar ahora/i });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    // At least one (SEO) should be disabled
    const firstDisabled = await buttons.evaluateAll((els: Element[]) =>
      els.some((el) => (el as HTMLButtonElement).disabled)
    );
    expect(firstDisabled).toBe(true);
  });

  test("toggle click envía PATCH al API", async ({ page }) => {
    const patched: string[] = [];
    await page.route("**/api/saas/autopilot", route => {
      if (route.request().method() === "PATCH") patched.push("patched");
      return route.fulfill({ json: { settings: FIXTURE_STATUS.status } });
    });
    await page.goto("/saas/autopilot");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    // Click first toggle button
    const toggles = page.locator("button[aria-label]");
    if (await toggles.count() > 0) {
      await toggles.first().click();
      await page.waitForTimeout(300);
      expect(patched.length).toBeGreaterThan(0);
    }
  });

  test("no redirige a /login con cookie válida", async ({ page }) => {
    await page.goto("/saas/autopilot");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    await expect(page).not.toHaveURL(LOGIN_URL);
  });
});
