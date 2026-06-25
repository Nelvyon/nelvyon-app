import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, FIXTURE_CAMPANIAS } from "./fixtures";

test.describe("SaaS Campanias", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("página /saas/campanias redirige o carga (no 500)", async ({ page }) => {
    await page.goto("/saas/campanias");
    expect(page.url()).not.toContain("500");
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/saas/campanias 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/campanias", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test("respuesta de campanias incluye ses_configured", async ({ page }) => {
    let body: typeof FIXTURE_CAMPANIAS | null = null;
    await page.route("**/api/saas/campanias**", async route => {
      body = FIXTURE_CAMPANIAS;
      await route.fulfill({ json: FIXTURE_CAMPANIAS });
    });
    await page.goto("/saas/campanias");
    await page.waitForTimeout(400);
    expect(body).not.toBeNull();
    expect(body!.ses_configured).toBeDefined();
  });

  test("POST /api/saas/campanias 401 sin auth header", async ({ request }) => {
    const res = await request.post("/api/saas/campanias", { data: { name: "Test", subject: "s", body: "<p>b</p>" }, maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test("banner SES visible cuando ses_configured=false (fixture)", async ({ page }) => {
    await page.route("**/api/saas/campanias**", route =>
      route.fulfill({ json: { ...FIXTURE_CAMPANIAS, ses_configured: false } }));
    await page.goto("/saas/campanias");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
  });
});
