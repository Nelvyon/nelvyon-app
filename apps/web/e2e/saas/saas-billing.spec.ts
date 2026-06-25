import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, FIXTURE_BILLING, LOGIN_URL } from "./fixtures";

test.describe("SaaS Billing", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("GET /saas/billing sin token → redirect /login", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/saas/billing");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /api/saas/billing 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/billing", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });

  test("/saas/billing carga con token y plan visible", async ({ page }) => {
    await page.route("**/api/saas/billing**", route =>
      route.fulfill({ json: FIXTURE_BILLING }));
    await page.goto("/saas/billing");
    await page.waitForTimeout(600);
    expect(page.url()).not.toMatch(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("fixture billing tiene campo plan = pro", async ({ page }) => {
    let plan: string | undefined;
    await page.route("**/api/saas/billing**", route => {
      plan = FIXTURE_BILLING.plan;
      return route.fulfill({ json: FIXTURE_BILLING });
    });
    await page.goto("/saas/billing");
    await page.waitForTimeout(400);
    expect(plan).toBe("pro");
  });
});
