import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis } from "./fixtures";

const FIXTURE_FUNNELS = {
  funnels: [
    {
      id: "f-e2e-1",
      name: "E2E Test Funnel",
      description: "Funnel para E2E",
      status: "active",
      publicSlug: "e2e-test-funnel-xyz",
      publishedAt: new Date().toISOString(),
      stepsCount: 2,
      totalVisitors: 120,
      totalConversions: 30,
      steps: [
        {
          id: "s-e2e-1", funnelId: "f-e2e-1", type: "landing",
          name: "Landing Page", content: "<h1>Bienvenido</h1>",
          ctaLabel: "Empezar", ctaUrl: null, stepOrder: 0, visitors: 120, conversions: 60,
        },
        {
          id: "s-e2e-2", funnelId: "f-e2e-1", type: "form",
          name: "Formulario", content: "<form>Tus datos</form>",
          ctaLabel: "Enviar", ctaUrl: null, stepOrder: 1, visitors: 60, conversions: 30,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const FIXTURE_ANALYTICS = {
  analytics: {
    funnelId: "f-e2e-1",
    totalVisitors: 120,
    totalConversions: 30,
    overallCvr: 25.0,
    steps: [
      { id: "s-e2e-1", name: "Landing Page", type: "landing", stepOrder: 0, visitors: 120, conversions: 60, cvr: 50.0, dropOff: 0, variants: [] },
      { id: "s-e2e-2", name: "Formulario", type: "form", stepOrder: 1, visitors: 60, conversions: 30, cvr: 50.0, dropOff: 50, variants: [] },
    ],
  },
};

test.describe("SaaS Funnels — depth (S36)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/funnels**", route => route.fulfill({ json: FIXTURE_FUNNELS }));
  });

  test("builder carga con lista de funnels y KPIs", async ({ page }) => {
    await page.goto("/saas/funnels", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText("E2E Test Funnel").or(page.getByText(/Embudos|Funnels/i))).toBeVisible({ timeout: 10_000 });
  });

  test("tab analytics se muestra al entrar al builder", async ({ page }) => {
    await page.route("**/api/saas/funnels/**", route => {
      const url = route.request().url();
      if (url.includes("resource=analytics")) return route.fulfill({ json: FIXTURE_ANALYTICS });
      if (url.includes("resource=variants")) return route.fulfill({ json: { variants: [] } });
      return route.fallback();
    });

    const listResponse = page.waitForResponse(
      res => res.url().includes("/api/saas/funnels") && res.request().method() === "GET" && !res.url().includes("resource="),
      { timeout: 15_000 },
    );
    await page.goto("/saas/funnels", { waitUntil: "domcontentloaded" });
    await listResponse;
    await expect(page.getByText("E2E Test Funnel")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Abrir builder" }).click();
    await expect(page.locator("h1", { hasText: "E2E Test Funnel" })).toBeVisible({ timeout: 15_000 });

    const analyticsTab = page.getByRole("button", { name: "Analytics" });
    await expect(analyticsTab).toBeVisible({ timeout: 10_000 });
    const analyticsResponse = page.waitForResponse(
      res => res.url().includes("resource=analytics") && res.request().method() === "GET",
      { timeout: 15_000 },
    );
    await analyticsTab.click();
    await analyticsResponse;

    await expect(page.getByRole("cell", { name: "Landing Page" }).or(page.getByText("Landing Page").first())).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("cell", { name: "Formulario" }).or(page.getByText("Formulario").first())).toBeVisible();
  });

  test("public funnel 404 sin slug válido", async ({ request }) => {
    const res = await request.get("/api/public/funnel/no-such-slug-xyz", { maxRedirects: 0 });
    expect([404, 500]).toContain(res.status());
  });
});
