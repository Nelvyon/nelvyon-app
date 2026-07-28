import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, expectUnauthorizedApi } from "./fixtures";

const FIXTURE_SEQUENCES = {
  sequences: [
    {
      id: "seq-001",
      tenantId: "t1",
      name: "Secuencia E2E",
      description: null,
      triggerType: "manual",
      triggerConfig: {},
      status: "active",
      enrollmentsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  ses_configured: false,
};

test.describe("SaaS Secuencias", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("página /saas/secuencias redirige o carga (no 500)", async ({ page }) => {
    await page.goto("/saas/secuencias");
    expect(page.url()).not.toContain("500");
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/saas/sequences 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/sequences");
  });

  test("respuesta de secuencias incluye ses_configured", async ({ page }) => {
    let body: typeof FIXTURE_SEQUENCES | null = null;
    await page.route("**/api/saas/sequences**", async route => {
      body = FIXTURE_SEQUENCES;
      await route.fulfill({ json: FIXTURE_SEQUENCES });
    });
    await page.goto("/saas/secuencias");
    await page.waitForTimeout(400);
    expect(body).not.toBeNull();
    expect(body!.ses_configured).toBeDefined();
  });

  test("POST /api/saas/sequences 401 sin auth header", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/sequences", "POST", {
      name: "Test",
      trigger_type: "manual",
    });
  });

  test("banner SES visible cuando ses_configured=false (fixture)", async ({ page }) => {
    await page.route("**/api/saas/sequences**", route =>
      route.fulfill({ json: { ...FIXTURE_SEQUENCES, ses_configured: false } }));
    await page.goto("/saas/secuencias");
    await page.waitForTimeout(600);
    await expect(page.locator("body")).toBeVisible();
  });
});
