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

  test("redirect next param preservado en URL de login", async ({ page }) => {
    await page.goto("/saas/dashboard?test=1");
    await expect(page).toHaveURL(/\/login\?next=%2Fsaas%2Fdashboard%3Ftest%3D1/);
  });
});

test.describe("SaaS Auth — autenticado carga dashboard", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("con token válido /saas/dashboard carga correctamente", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page).not.toHaveURL(LOGIN_URL);
    // Acotado a `main` por el mismo motivo que en a11y-core-routes.spec.ts: la
    // copia temporal del streaming de React (`div#S:1`) hacia saltar el modo
    // estricto con "resolved to 2 elements".
    await expect(page.locator("main [data-testid='saas-sidebar']")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).toBeVisible();
  });
});
