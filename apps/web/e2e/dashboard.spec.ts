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
    await expect(nav.getByText("Dashboard", { exact: true })).toBeVisible();
    await expect(nav.getByText("Setup", { exact: false })).toBeVisible();
    await expect(nav.getByText("Unified Inbox", { exact: true })).toBeVisible();
    await expect(nav.getByText("CRM", { exact: true })).toBeVisible();
    await expect(nav.getByText("AI Panel", { exact: true })).toBeVisible();
  });

  test("Empty state visible si no hay jobs", async ({ page }) => {
    await page.goto("/saas/dashboard");
    await expect(page.getByText("Operaciones")).toBeVisible();
    await expect(page.getByText("Módulos activos")).toBeVisible();
  });
});
