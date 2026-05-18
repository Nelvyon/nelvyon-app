import { expect, test } from "@playwright/test";

type OnboardingTenant = {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  plan: "starter" | "pro" | "enterprise";
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[];
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
};

function buildTenant(step: number): OnboardingTenant {
  return {
    id: "tenant-e2e",
    userId: "user-e2e",
    companyName: "NELVYON Labs",
    industry: "SaaS",
    plan: "starter",
    website: null,
    phone: null,
    employees: null,
    goals: [],
    onboardingCompleted: false,
    onboardingStep: step,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test.describe("Onboarding SaaS", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: "nelvyon_token",
        value: "e2e-token",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("Onboarding muestra paso 1 al cargar", async ({ page }) => {
    await page.route("**/api/saas/onboarding", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tenant: null }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tenant: buildTenant(2) }) });
    });
    await page.goto("/saas/onboarding");
    await expect(page.getByText("Paso 1 — Bienvenida")).toBeVisible();
  });

  test("Avanzar de paso 1 a paso 2 funciona y progreso se actualiza", async ({ page }) => {
    await page.route("**/api/saas/onboarding", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tenant: null }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tenant: buildTenant(2) }) });
    });
    await page.goto("/saas/onboarding");
    await page.getByLabel("Nombre de la empresa").fill("NELVYON Labs");
    await page.getByLabel("Industria").fill("SaaS");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Paso 2 — Plan de suscripción")).toBeVisible();
    await expect(page.getByText("Paso 2 de 4")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Progreso de onboarding" })).toHaveAttribute("aria-valuenow", "50");
  });

  test("Paso 4 muestra botón Ir al Dashboard", async ({ page }) => {
    await page.route("**/api/saas/onboarding", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tenant: buildTenant(4) }),
      });
    });
    await page.goto("/saas/onboarding");
    await expect(page.getByText("Paso 4 — Confirmación")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ir al Dashboard" })).toBeVisible();
  });
});
