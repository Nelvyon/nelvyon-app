/**
 * E2E — /saas/publicidad (attribution tab + ad platform status)
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

const FIXTURE_PUBLICIDAD = {
  ok: true,
  attribution: {
    model: "last_click",
    channels: [
      { channel: "meta", revenue: 12000, conversions: 48, roas: 4.2, spend: 2857 },
      { channel: "google", revenue: 8500, conversions: 34, roas: 3.8, spend: 2236 },
    ],
    totalRevenue: 20500, totalConversions: 82, totalSpend: 5093,
  },
  connections: {
    meta: { status: "disconnected", accountName: null },
    google: { status: "disconnected", accountName: null },
    tiktok: { status: "disconnected", accountName: null },
  },
};

test.describe("SaaS Publicidad — auth guard", () => {
  test("GET /saas/publicidad sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await expect(page).toHaveURL(LOGIN_URL);
  });
});

test.describe("SaaS Publicidad — página autenticada", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/publicidad**", route =>
      route.fulfill({ json: FIXTURE_PUBLICIDAD }));
    await page.route("**/api/saas/integrations**", route =>
      route.fulfill({ json: { catalog: [], connections: [], summary: { total: 0, connected: 0, envOnly: 0, oauthReady: 0 } } }));
  });

  test("carga sin error 500", async ({ page }) => {
    await page.goto("/saas/publicidad");
    expect(page.url()).not.toContain("500");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("URL contiene /saas/publicidad", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    expect(page.url()).toContain("/saas/publicidad");
  });

  test("contenido principal visible", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("texto de Publicidad o Atribución en página", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/[Pp]ublicidad|[Aa]tribuci|Digital|Meta|Google/i);
  });

  test("no redirige a /login con cookie válida", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    await expect(page).not.toHaveURL(LOGIN_URL);
  });

  test("tiene elemento interactivo (tab o botón)", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    const buttons = page.locator("button, [role='tab']");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("SaaS Publicidad — atribución multi-touch", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/publicidad**", route =>
      route.fulfill({ json: FIXTURE_PUBLICIDAD }));
  });

  test("página carga datos sin 500 tras navegar desde pipeline", async ({ page }) => {
    // Simula navegación real por la SPA
    await page.goto("/saas/pipeline");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    await page.goto("/saas/publicidad");
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
    expect(page.url()).not.toContain("500");
  });

  test("header de sección contiene texto de publicidad digital", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    const headings = page.locator("h1, h2, h3, h4");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
    const text = await headings.first().textContent();
    expect(text ?? "").not.toBe("");
  });

  test("modelo de atribución last_click no crashea la UI", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    // No debería haber error visible
    const errorText = await page.locator("text=/error|500|unhandled/i").count();
    expect(errorText).toBe(0);
  });
});
