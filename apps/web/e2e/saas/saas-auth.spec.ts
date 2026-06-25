import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, LOGIN_URL } from "./fixtures";

test.describe("SaaS Auth — redirect guards", () => {
  test("GET /saas/dashboard sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /saas/crm/contacts sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/crm/contacts");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /saas/settings sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/settings");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /saas/workflows sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/workflows");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /saas/billing sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/billing");
    await expect(page).toHaveURL(LOGIN_URL);
  });
});

test.describe("SaaS Auth — autenticado carga dashboard", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/dashboard**", route =>
      route.fulfill({ json: { contacts: 42, deals: 7, revenue: 15000, workflows: 3, ses_configured: false } }));
  });

  test("con token válido /saas/dashboard carga correctamente", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("redirect next param preservado en URL de login", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/saas/dashboard?test=1");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
