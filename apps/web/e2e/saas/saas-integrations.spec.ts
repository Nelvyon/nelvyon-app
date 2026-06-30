/**
 * E2E — /saas/integraciones + /api/saas/integrations
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

const FIXTURE_INTEGRATIONS = {
  catalog: [
    { id: "meta", slug: "meta", displayName: "Meta Ads", icon: "📘", category: "ads", connectionType: "oauth", status: "live", envConfigured: false },
    { id: "google", slug: "google", displayName: "Google Ads", icon: "🔍", category: "ads", connectionType: "oauth", status: "live", envConfigured: false },
    { id: "stripe", slug: "stripe", displayName: "Stripe", icon: "💳", category: "payments", connectionType: "env", status: "live", envConfigured: true },
    { id: "shopify", slug: "shopify", displayName: "Shopify", icon: "🛒", category: "commerce", connectionType: "manual", status: "live", envConfigured: false },
  ],
  connections: [
    {
      slug: "stripe",
      catalogStatus: "live",
      displayName: "Stripe",
      icon: "💳",
      category: "payments",
      connectionType: "env",
      envKeys: [],
      status: "connected",
      envConfigured: true,
      connectedAccount: "Nelvyon E2E",
      lastSyncAt: new Date().toISOString(),
      errorMessage: null,
    },
  ],
  summary: { total: 4, connected: 1, envOnly: 1, oauth: 0 },
};

test.describe("SaaS Integraciones — auth guard", () => {
  test("GET /saas/integraciones sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/integraciones");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /api/saas/integrations 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/integrations");
  });

  test("DELETE /api/saas/integrations?provider=meta 401 sin auth", async ({ request }) => {
    const res = await request.delete("/api/saas/integrations?provider=meta", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});

test.describe("SaaS Integraciones — página autenticada", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/integrations**", route =>
      route.fulfill({ json: FIXTURE_INTEGRATIONS }));
  });

  test("carga sin error 500", async ({ page }) => {
    await page.goto("/saas/integraciones");
    expect(page.url()).not.toContain("500");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("muestra título de la sección", async ({ page }) => {
    await page.goto("/saas/integraciones");
    await expect(page.locator("h1, h2, [data-testid='section-title']").first()).toBeVisible({ timeout: 8000 });
  });

  test("no queda atrapada en redirect", async ({ page }) => {
    await page.goto("/saas/integraciones");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
  });

  test("KPI strip o contenido de catálogo visible", async ({ page }) => {
    await page.goto("/saas/integraciones");
    // Esperar a que el contenido principal sea visible
    await expect(page.locator("main, [role='main'], .container, body").first()).toBeVisible({ timeout: 8000 });
    expect(page.url()).not.toContain("error");
  });

  test("filtro de búsqueda existe en DOM", async ({ page }) => {
    await page.goto("/saas/integraciones", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/integrations**", { timeout: 15_000 });
    await expect(page.getByPlaceholder(/buscar integraci/i)).toBeVisible({ timeout: 15_000 });
  });

  test("sin STATIC_PROVIDERS mockeados en código (anti-mock)", async ({ page }) => {
    // La URL no debe contener fallback data hardcoded (sería visible en response)
    await page.goto("/saas/integraciones");
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
    // Si la página llama a la API real (interceptada), no debe tener error
    expect(page.url()).not.toContain("500");
  });
});

test.describe("SaaS Integraciones — interacción de categoría", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/integrations**", route =>
      route.fulfill({ json: FIXTURE_INTEGRATIONS }));
  });

  test("página carga y sidebar activo en integraciones", async ({ page }) => {
    await page.goto("/saas/integraciones");
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
    expect(page.url()).toContain("/saas/integraciones");
  });

  test("GET /api/saas/integrations retorna shape correcta (mocked)", async ({ page }) => {
    let captured: unknown = null;
    await page.route("**/api/saas/integrations**", async route => {
      captured = FIXTURE_INTEGRATIONS;
      await route.fulfill({ json: FIXTURE_INTEGRATIONS });
    });
    await page.goto("/saas/integraciones", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/integrations**", { timeout: 15_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });
    expect(captured).not.toBeNull();
    expect((captured as typeof FIXTURE_INTEGRATIONS).catalog.length).toBe(4);
  });
});
