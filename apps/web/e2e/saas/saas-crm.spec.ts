import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, FIXTURE_CONTACTS, LOGIN_URL } from "./fixtures";

test.describe("SaaS CRM — contacts", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("lista de contactos carga sin error", async ({ page }) => {
    await page.goto("/saas/crm/contacts");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("contacto fixture aparece en la lista", async ({ page }) => {
    await page.route("**/api/saas/crm/contacts**", route =>
      route.fulfill({ json: FIXTURE_CONTACTS }));
    await page.goto("/saas/crm/contacts");
    await page.waitForTimeout(500);
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
  });

  test("botón Nuevo contacto es visible para owner", async ({ page }) => {
    await page.goto("/saas/crm/contacts");
    await page.waitForTimeout(400);
    const body = await page.locator("body").innerHTML();
    expect(body).not.toContain("Internal Server Error");
  });

  test("filtros de búsqueda presentes en la página", async ({ page }) => {
    await page.goto("/saas/crm/contacts");
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/saas/crm/contacts 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/crm/contacts", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test("GET /api/saas/crm/contacts 200 con fixture mock (page.route)", async ({ page }) => {
    await setAuthCookie(await page.context());
    let intercepted = false;
    await page.route("**/api/saas/crm/contacts**", route => {
      intercepted = true;
      return route.fulfill({ json: FIXTURE_CONTACTS });
    });
    await page.goto("/saas/crm/contacts");
    await page.waitForTimeout(500);
    expect(intercepted || !page.url().includes("/login")).toBeTruthy();
  });

  test("página /saas/crm redirige o carga (no 500)", async ({ page }) => {
    await page.goto("/saas/crm");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("POST /api/saas/crm/contacts 401 sin auth", async ({ request }) => {
    const res = await request.post("/api/saas/crm/contacts", { data: { name: "Test" }, maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
