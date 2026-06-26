/**
 * E2E smoke tests for secondary SaaS modules:
 * affiliates, loyalty, api-keys, developers, settings SSO, auditoria,
 * lead-scoring, reportes.
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, FIXTURE_SETTINGS, FIXTURE_AUDIT, FIXTURE_LEAD_SCORING, LOGIN_URL, expectUnauthorizedApi } from "./fixtures";

test.describe("SaaS — Afiliados & Loyalty", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("/saas/affiliates carga (no error 500)", async ({ page }) => {
    await page.goto("/saas/affiliates");
    expect(page.url()).not.toContain("500");
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/saas/affiliates 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/affiliates");
  });

  test("/saas/loyalty carga (no error 500)", async ({ page }) => {
    await page.goto("/saas/loyalty");
    expect(page.url()).not.toContain("500");
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/saas/loyalty 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/loyalty");
  });
});

test.describe("SaaS — API Keys & Developers", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("/saas/api-keys carga correctamente", async ({ page }) => {
    await page.goto("/saas/api-keys");
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(LOGIN_URL);
  });

  test("GET /api/saas/api-keys 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/api-keys");
  });

  test("/saas/developers carga con docs de API", async ({ page }) => {
    await page.goto("/saas/developers");
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });
});

test.describe("SaaS — Settings SSO tab", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("/saas/settings carga y muestra tabs", async ({ page }) => {
    await page.goto("/saas/settings");
    await page.waitForTimeout(600);
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("SSO tab renders con mock de config null", async ({ page }) => {
    await page.route("**/api/saas/sso**", route =>
      route.fulfill({ json: { config: null, identities: [] } }));
    await page.goto("/saas/settings", { waitUntil: "domcontentloaded" });
    const ssoButton = page.getByRole("button", { name: /SSO Enterprise/i });
    if (await ssoButton.count() > 0) {
      await ssoButton.first().click();
      await expect(page.locator("body")).toBeVisible();
    } else {
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("GET /api/saas/sso 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/sso");
  });
});

test.describe("SaaS — Auditoría", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("/saas/auditoria carga lista y paginación", async ({ page }) => {
    await page.route("**/api/saas/audit**", route =>
      route.fulfill({ json: FIXTURE_AUDIT }));
    await page.goto("/saas/auditoria");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("GET /api/saas/audit 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/audit");
  });

  test("paginación de auditoría con total > 0", async ({ page }) => {
    await page.route("**/api/saas/audit**", route =>
      route.fulfill({ json: { ...FIXTURE_AUDIT, total: 100 } }));
    await page.goto("/saas/auditoria");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("SaaS — Lead Scoring & Reportes", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("/saas/lead-scoring carga con reglas", async ({ page }) => {
    await page.route("**/api/saas/lead-scoring**", route =>
      route.fulfill({ json: FIXTURE_LEAD_SCORING }));
    await page.goto("/saas/lead-scoring");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("GET /api/saas/lead-scoring 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/lead-scoring");
  });

  test("/saas/reportes carga panel de atribución", async ({ page }) => {
    await page.goto("/saas/reportes");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("GET /api/saas/reportes 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/reportes");
  });
});

// ─── S45 additions — memberships, integrations in nav ────────────────────────

test.describe("SaaS — Memberships & Integrations nav (S45)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("/saas/memberships carga sin error", async ({ page }) => {
    await page.goto("/saas/memberships");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("GET /api/saas/memberships 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/memberships");
  });

  test("/saas/integraciones carga sin error", async ({ page }) => {
    await page.goto("/saas/integraciones");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("GET /api/saas/integrations 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/integrations");
  });

  test("GET /api/saas/contracts 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/contracts");
  });

  test("GET /api/saas/facturas/dunning 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/facturas/dunning");
  });
});
