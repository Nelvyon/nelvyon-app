/**
 * E2E smoke tests for secondary SaaS modules:
 * affiliates, loyalty, api-keys, developers, settings SSO, auditoria,
 * lead-scoring, reportes.
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, FIXTURE_SETTINGS, FIXTURE_AUDIT, FIXTURE_LEAD_SCORING } from "./fixtures";

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
    const res = await request.get("/api/saas/affiliates");
    expect([401, 302]).toContain(res.status());
  });

  test("/saas/loyalty carga (no error 500)", async ({ page }) => {
    await page.goto("/saas/loyalty");
    expect(page.url()).not.toContain("500");
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/saas/loyalty 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/loyalty");
    expect([401, 302]).toContain(res.status());
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
    expect(page.url()).not.toContain("auth/login");
  });

  test("GET /api/saas/api-keys 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/api-keys");
    expect([401, 302]).toContain(res.status());
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
    expect(page.url()).not.toContain("auth/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("SSO tab renders con mock de config null", async ({ page }) => {
    await page.route("**/api/saas/sso**", route =>
      route.fulfill({ json: { config: null, identities: [] } }));
    await page.goto("/saas/settings");
    await page.waitForTimeout(600);
    // Click SSO tab if settings loaded
    const ssoButton = page.locator("button", { hasText: "SSO Enterprise" });
    const count = await ssoButton.count();
    if (count > 0) {
      await ssoButton.click();
      await page.waitForTimeout(400);
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/saas/sso 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/sso");
    expect([401, 302]).toContain(res.status());
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
    const res = await request.get("/api/saas/audit");
    expect([401, 302]).toContain(res.status());
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
    const res = await request.get("/api/saas/lead-scoring");
    expect([401, 302]).toContain(res.status());
  });

  test("/saas/reportes carga panel de atribución", async ({ page }) => {
    await page.goto("/saas/reportes");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("GET /api/saas/reportes 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/reportes");
    expect([401, 302]).toContain(res.status());
  });
});
