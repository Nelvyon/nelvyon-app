import { expect, test } from "@playwright/test";

const dashboardPayload = {
  tenant: {
    id: "tenant-dashboard",
    userId: "user-dashboard",
    companyName: "NELVYON Labs",
    industry: "SaaS",
    plan: "pro",
    website: null,
    phone: null,
    employees: null,
    goals: [],
    onboardingCompleted: true,
    onboardingStep: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  activeJobs: 0,
  completedJobs: 0,
  totalSpend: 0,
  recentActivity: [],
};

test.describe("Dashboard SaaS", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: "nelvyon_token",
        value: "e2e-token",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.route("**/api/saas/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(dashboardPayload),
      });
    });
  });

  test("Dashboard muestra 4 KPI cards", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page.getByText("Servicios activos")).toBeVisible();
    await expect(page.getByText("Servicios completados")).toBeVisible();
    await expect(page.getByText("Gasto total")).toBeVisible();
    await expect(page.getByText("Plan actual")).toBeVisible();
  });

  test("Sidebar tiene todos los nav links", async ({ page }) => {
    await page.goto("/saas/dashboard");
    const nav = page.locator("aside");
    await expect(nav.getByText("Dashboard", { exact: true })).toBeVisible();
    await expect(nav.getByText("Servicios", { exact: true })).toBeVisible();
    await expect(nav.getByText("CRM", { exact: true })).toBeVisible();
    await expect(nav.getByText("Workflows", { exact: true })).toBeVisible();
    await expect(nav.getByText("Campanas", { exact: true })).toBeVisible();
    await expect(nav.getByText("Configuracion", { exact: true })).toBeVisible();
  });

  test("Empty state visible si no hay jobs", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page.getByText("Aun no hay servicios ejecutados. Empieza ahora desde Servicios.")).toBeVisible();
  });
});
