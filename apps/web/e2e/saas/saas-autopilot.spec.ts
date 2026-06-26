/**
 * E2E — /saas/autopilot (Autopilot Command Center)
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

const FIXTURE_ENTREGABLES = {
  deliverables: [],
  summary: { total: 3, pendingReview: 0, approved: 2, avgQaScore: 90, byType: {}, byStatus: {} },
};

async function gotoAutopilotReady(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/saas/autopilot", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("SEO mensual")).toBeVisible({ timeout: 15_000 });
}

test.describe("SaaS Autopilot — auth guard", () => {
  test("GET /saas/autopilot sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/autopilot");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /api/saas/autopilot 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/autopilot");
  });

  test("PATCH /api/saas/autopilot 401 sin auth", async ({ request }) => {
    const res = await request.patch("/api/saas/autopilot", {
      data: { seoEnabled: true },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/saas/autopilot/run 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/autopilot/run", "POST", { service: "seo" });
  });
});

test.describe("SaaS Autopilot — página autenticada", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/entregables**", route =>
      route.fulfill({ json: FIXTURE_ENTREGABLES }));
  });

  test("carga sin error 500", async ({ page }) => {
    await gotoAutopilotReady(page);
    expect(page.url()).not.toContain("500");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("URL contiene /saas/autopilot tras carga", async ({ page }) => {
    await gotoAutopilotReady(page);
    expect(page.url()).toContain("/saas/autopilot");
  });

  test("4 toggles de servicio visibles", async ({ page }) => {
    await gotoAutopilotReady(page);
    await expect(page.getByText("Calendario social")).toBeVisible();
    await expect(page.getByText(/Reputaci/i)).toBeVisible();
    await expect(page.getByText(/Ads snapshot/i)).toBeVisible();
  });

  test("KPI strip muestra servicios activos y entregables", async ({ page }) => {
    await gotoAutopilotReady(page);
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/Servicios activos|activos/i);
    expect(bodyText).toMatch(/Entregables este mes/i);
  });

  test("link 'Ver entregables' apunta a /saas/entregables", async ({ page }) => {
    await gotoAutopilotReady(page);
    const link = page.locator("a", { hasText: /Ver entregables/i });
    await expect(link).toHaveAttribute("href", "/saas/entregables");
  });

  test("botón 'Ejecutar ahora' deshabilitado cuando servicio OFF (seo)", async ({ page }) => {
    await gotoAutopilotReady(page);
    const buttons = page.locator("button", { hasText: /Ejecutar ahora/i });
    await expect(buttons.first()).toBeDisabled();
  });

  test("toggle click envía PATCH al API", async ({ page }) => {
    await gotoAutopilotReady(page);
    const patchReq = page.waitForRequest(
      r => r.url().includes("/api/saas/autopilot") && r.method() === "PATCH",
      { timeout: 10_000 },
    );
    await page.getByRole("button", { name: "Toggle SEO mensual" }).click();
    await patchReq;
  });

  test("no redirige a /login con cookie válida", async ({ page }) => {
    await gotoAutopilotReady(page);
    await expect(page).not.toHaveURL(LOGIN_URL);
  });
});
