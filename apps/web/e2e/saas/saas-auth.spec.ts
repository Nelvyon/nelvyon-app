import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, FIXTURE_SETTINGS } from "./fixtures";

test.describe("SaaS Auth — redirect guards", () => {
  test("GET /saas/dashboard sin token → redirect /auth/login", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("GET /saas/crm/contacts sin token → redirect /auth/login", async ({ page }) => {
    await page.goto("/saas/crm/contacts");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("GET /saas/settings sin token → redirect /auth/login", async ({ page }) => {
    await page.goto("/saas/settings");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("GET /saas/workflows sin token → redirect /auth/login", async ({ page }) => {
    await page.goto("/saas/workflows");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("GET /saas/billing sin token → redirect /auth/login", async ({ page }) => {
    await page.goto("/saas/billing");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("SaaS Auth — autenticado carga dashboard", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    // Mock dashboard metrics
    await page.route("**/api/saas/dashboard**", route =>
      route.fulfill({ json: { contacts: 42, deals: 7, revenue: 15000, workflows: 3, ses_configured: false } }));
  });

  test("con token válido /saas/dashboard carga correctamente", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    // Page loaded without redirect — that's the success signal
    await expect(page.locator("body")).toBeVisible();
  });

  test("redirect next param preservado en URL de login", async ({ page, context }) => {
    // Remove cookie first to test the redirect param
    await context.clearCookies();
    await page.goto("/saas/dashboard?test=1");
    await expect(page).toHaveURL(/\/auth\/login\?next=/);
  });
});
