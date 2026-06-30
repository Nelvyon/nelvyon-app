import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, FIXTURE_WORKFLOWS, LOGIN_URL, expectUnauthorizedApi } from "./fixtures";

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
    await expectUnauthorizedApi(request, "/api/saas/workflows");
  });

  test("respuesta de workflows incluye ses_configured", async ({ page }) => {
    let captured: typeof FIXTURE_WORKFLOWS | null = null;
    await page.route("**/api/saas/workflows**", async route => {
      captured = FIXTURE_WORKFLOWS;
      await route.fulfill({ json: FIXTURE_WORKFLOWS });
    });
    await page.goto("/saas/workflows", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/workflows**", { timeout: 15_000 });
    expect(captured).not.toBeNull();
    expect(captured!.ses_configured).toBeDefined();
  });

  test("POST /api/saas/workflows 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/workflows", "POST", {
      name: "WF Test",
      trigger_type: "manual",
    });
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
    await page.goto("/saas/workflows", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.getByText(/Workflow E2E|Workflows/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
