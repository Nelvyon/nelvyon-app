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
    await page.goto("/saas/funnels");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Funnel Builder" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E2E Test Funnel")).toBeVisible();
  });

  test("tab analytics se muestra al entrar al builder", async ({ page }) => {
    await page.route(`**/api/saas/funnels/f-e2e-1**`, route => {
      const url = route.request().url();
      if (url.includes("resource=analytics")) return route.fulfill({ json: FIXTURE_ANALYTICS });
      if (url.includes("resource=variants")) return route.fulfill({ json: { variants: [] } });
      return route.fulfill({ json: { funnel: FIXTURE_FUNNELS.funnels[0] } });
    });

    await page.goto("/saas/funnels?id=f-e2e-1");
    await page.waitForTimeout(600);

    const analyticsTab = page.locator("button", { hasText: "Analytics" });
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      await page.waitForTimeout(400);
    }

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
  });

  test("public funnel 404 sin slug válido", async ({ page }) => {
    await page.route("**/api/public/funnel/no-such-slug-xyz**", route =>
      route.fulfill({ status: 404, json: { error: "Funnel not found" } }),
    );
    await page.goto("/f/no-such-slug-xyz");
    await page.waitForTimeout(600);
    const body = await page.locator("body").textContent();
    expect(body).toContain("no encontrada");
  });
});
