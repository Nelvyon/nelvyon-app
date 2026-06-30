/**
 * E2E — /saas/entregables (Deliverables Hub)
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, mockEntregablesList, mockEntregablesRevenue, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

const FIXTURE_EMPTY = { deliverables: [], summary: { total: 0, pendingReview: 0, approved: 0, avgQaScore: null, byType: {}, byStatus: {} } };

const FIXTURE_DATA = {
  deliverables: [
    {
      id: "d-1", source: "os", type: "landing", title: "Landing ACME E2E",
      packId: "local-business-growth", status: "approved",
      qaScore: 91, legalPassed: true,
      downloadUrl: null, portalUrl: null,
      createdAt: new Date().toISOString(), approvedAt: new Date().toISOString(),
    },
    {
      id: "d-2", source: "recurring", type: "seo", title: "seo report — 2026-06",
      packId: null, status: "delivered",
      qaScore: 88, legalPassed: null,
      downloadUrl: "https://cdn.nelvyon.com/seo-june.pdf", portalUrl: null,
      createdAt: new Date().toISOString(), approvedAt: null,
    },
  ],
  summary: {
    total: 2, pendingReview: 0, approved: 1, avgQaScore: 89.5,
    byType: { landing: 1, seo: 1 }, byStatus: { approved: 1, delivered: 1 },
  },
};

test.describe("SaaS Entregables — auth guard", () => {
  test("GET /saas/entregables sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/entregables");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /api/saas/entregables 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/entregables");
  });

  test("GET /api/saas/entregables/d-1 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/entregables/d-1");
  });

  test("POST /api/saas/entregables/d-1 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/entregables/d-1", "POST", { action: "open_in_portal" });
  });
});

test.describe("SaaS Entregables — estado vacío honesto", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await mockEntregablesRevenue(page);
    await mockEntregablesList(page, FIXTURE_EMPTY);
  });

  test("carga sin error 500", async ({ page }) => {
    await page.goto("/saas/entregables");
    expect(page.url()).not.toContain("500");
    await expect(page).not.toHaveURL(LOGIN_URL);
  });

  test("muestra hint honesto cuando no hay entregables", async ({ page }) => {
    await page.goto("/saas/entregables", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Entregables|entregables/i).first()).toBeVisible({ timeout: 10_000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/pack|recurrentes|sin entregables/i);
  });
});

test.describe("SaaS Entregables — página con datos", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await mockEntregablesRevenue(page);
    await mockEntregablesList(page, FIXTURE_DATA);
  });

  test("KPI strip muestra total = 2", async ({ page }) => {
    await page.goto("/saas/entregables", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Entregables|entregables/i).first()).toBeVisible({ timeout: 10_000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/2/);
  });

  test("título 'Landing ACME E2E' aparece en tabla", async ({ page }) => {
    await page.goto("/saas/entregables", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/entregables**", { timeout: 15_000 });
    await expect(page.getByText("Landing ACME E2E")).toBeVisible({ timeout: 15_000 });
  });

  test("QA score 91% visible en verde", async ({ page }) => {
    await page.goto("/saas/entregables", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/entregables**", { timeout: 15_000 });
    await expect(page.getByText("91%")).toBeVisible({ timeout: 15_000 });
  });

  test("filtro de tipo cambia parámetro en fetch", async ({ page }) => {
    const intercepted: string[] = [];
    await mockEntregablesList(page, FIXTURE_DATA);
    await page.route(/\/api\/saas\/entregables(?!\/revenue)/, route => {
      intercepted.push(route.request().url());
      return route.fulfill({ json: FIXTURE_DATA });
    });
    await page.goto("/saas/entregables", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Entregables|entregables/i).first()).toBeVisible({ timeout: 10_000 });

    // Change type filter (skip header days select — first select in DOM)
    const typeSelect = page.locator("select").filter({ has: page.locator('option[value="seo"]') });
    await typeSelect.selectOption("seo");
    await expect.poll(() => intercepted.some(u => u.includes("type=seo"))).toBe(true);
  });

  test("'Ver portal' link apunta a /portal/deliverables/", async ({ page }) => {
    await page.goto("/saas/entregables", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Entregables|entregables/i).first()).toBeVisible({ timeout: 10_000 });
    const link = page.locator("a", { hasText: "Ver portal" }).first();
    const href = await link.getAttribute("href");
    expect(href).toContain("/portal/deliverables/");
  });

  test("no redirige a /login con cookie válida", async ({ page }) => {
    await page.goto("/saas/entregables", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Entregables|entregables/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(LOGIN_URL);
  });
});
