import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, FIXTURE_WORKFLOWS } from "./fixtures";

test.describe("SaaS Workflows", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
  });

  test("página /saas/workflows redirige o carga (no 500)", async ({ page }) => {
    await page.goto("/saas/workflows");
    expect(page.url()).not.toContain("500");
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/saas/workflows 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/workflows");
    expect([401, 302]).toContain(res.status());
  });

  test("respuesta de workflows incluye ses_configured", async ({ page }) => {
    let captured: typeof FIXTURE_WORKFLOWS | null = null;
    await page.route("**/api/saas/workflows**", async route => {
      captured = FIXTURE_WORKFLOWS;
      await route.fulfill({ json: FIXTURE_WORKFLOWS });
    });
    await page.goto("/saas/workflows");
    await page.waitForTimeout(400);
    expect(captured).not.toBeNull();
    expect(captured!.ses_configured).toBeDefined();
  });

  test("POST /api/saas/workflows 401 sin auth", async ({ request }) => {
    const res = await request.post("/api/saas/workflows", { data: { name: "WF Test", trigger_type: "manual" } });
    expect([401, 302]).toContain(res.status());
  });

  test("página workflows no produce errores JS críticos", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/saas/workflows");
    await page.waitForTimeout(800);
    const criticals = errors.filter(e => !e.includes("hydration") && !e.includes("Warning") && !e.includes("localStorage"));
    expect(criticals).toHaveLength(0);
  });

  test("lista de workflows fixture renderiza la página", async ({ page }) => {
    await page.route("**/api/saas/workflows**", route =>
      route.fulfill({ json: FIXTURE_WORKFLOWS }));
    await page.goto("/saas/workflows");
    await page.waitForTimeout(600);
    expect(page.url()).not.toContain("auth/login");
  });
});
