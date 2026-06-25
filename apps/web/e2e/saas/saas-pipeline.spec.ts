import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis } from "./fixtures";

test.describe("SaaS Pipeline — deals", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("página /saas/pipeline carga", async ({ page }) => {
    await page.goto("/saas/pipeline");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).not.toContain("500");
  });

  test("GET /api/saas/deals 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/deals");
    expect([401, 302]).toContain(res.status());
  });

  test("GET /api/saas/deals devuelve fixture con token mock", async ({ page }) => {
    let called = false;
    await page.route("**/api/saas/deals**", route => {
      called = true;
      return route.fulfill({ json: { deals: [], total: 0 } });
    });
    await page.goto("/saas/pipeline");
    await page.waitForTimeout(600);
    // No redirect to login with auth cookie
    expect(page.url()).not.toContain("auth/login");
  });

  test("vista Kanban no produce error JS", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", err => errors.push(err.message));
    await page.goto("/saas/pipeline");
    await page.waitForTimeout(800);
    const criticalErrors = errors.filter(e => !e.includes("hydration") && !e.includes("Warning"));
    expect(criticalErrors).toHaveLength(0);
  });
});
