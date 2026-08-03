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
  moduleStats: {
    contacts: 0,
    campaigns: 0,
    activeWorkflows: 0,
    forms: 0,
    upcomingAppointments: 0,
  },
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
    // El shell lee los permisos de /api/saas/settings. Sin mock devuelve 401 y
    // el filtro RBAC oculta los modulos que exigen permiso (CRM, Pipeline...).
    await page.route("**/api/saas/settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          role: "owner",
          permissions: [
            "contacts.read", "contacts.write", "deals.read", "campanias.read",
            "workflows.read", "analytics.read",
          ],
          tenant: { companyName: "NELVYON Labs", plan: "pro" },
        }),
      });
    });
  });

  test("Dashboard muestra 4 KPI cards", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page.getByText("SaaS Dashboard")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Welcome, NELVYON Labs/i })).toBeVisible();
    await expect(page.getByText("Active services")).toBeVisible();
    await expect(page.getByText("Completed services")).toBeVisible();
    await expect(page.getByText("Total spend")).toBeVisible();
    await expect(page.getByText("Current plan")).toBeVisible();
  });

  test("Sidebar tiene todos los nav links", async ({ page }) => {
    await page.goto("/saas/dashboard");
    const nav = page.getByTestId("saas-sidebar");
    // El sidebar de W3CRM es un ACORDEON: solo mantiene un grupo abierto y lo
    // expande cuando llegan los permisos. Los modulos de los grupos cerrados
    // siguen en el DOM. Este test verifica que el menu CONTIENE todos los
    // modulos autorizados, no cual de ellos esta desplegado en un instante
    // concreto: asi es determinista y no depende del momento de la animacion.
    await expect(nav.locator('a[href="/saas/dashboard"]').first()).toBeAttached({ timeout: 30_000 });
    await expect(nav.locator('a[href="/saas/setup"]')).toBeAttached();
    await expect(nav.locator('a[href="/saas/inbox"]')).toBeAttached();
    await expect(nav.locator('a[href="/saas/crm"]')).toBeAttached();
    await expect(nav.locator('a[href="/saas/ai"]')).toBeAttached();
    // El grupo de la ruta actual queda marcado como activo.
    await expect(nav.locator("a.mm-active").first()).toBeAttached();
  });

  test("Empty state visible si no hay jobs", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page.getByText("Operaciones")).toBeVisible();
    await expect(page.getByText("Módulos activos")).toBeVisible();
  });
});
