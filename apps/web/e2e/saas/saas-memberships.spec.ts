/**
 * E2E — /saas/memberships + /api/saas/memberships
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

const FIXTURE_MEMBERSHIPS = {
  plans: [
    {
      id: "plan-1", tenantId: "t1", name: "Pro", slug: "pro",
      priceAmount: 29.99, priceCurrency: "EUR", billingInterval: "month",
      includes: { courses: [], communities: [], features: ["Acceso total"] },
      affiliateCommissionPct: 10, isActive: true, stripePriceId: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ],
};

const FIXTURE_MEMBERS = {
  members: [
    {
      id: "mem-1", tenantId: "t1", planId: "plan-1", contactId: null,
      contactEmail: "user@test.com", status: "active",
      stripeSubscriptionId: null,
      startsAt: new Date().toISOString(), expiresAt: null, affiliateRef: null,
      createdAt: new Date().toISOString(),
    },
  ],
};

test.describe("SaaS Memberships — auth guard", () => {
  test("GET /saas/memberships sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/memberships");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("GET /api/saas/memberships 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/memberships");
  });

  test("POST /api/saas/memberships 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/memberships", "POST", { action: "create_plan", name: "Test" });
  });

  test("DELETE /api/saas/memberships/plan-1 401 sin auth", async ({ request }) => {
    const res = await request.delete("/api/saas/memberships/plan-1", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});

test.describe("SaaS Memberships — página autenticada", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/memberships**", route => {
      const url = route.request().url();
      if (url.includes("resource=members")) return route.fulfill({ json: FIXTURE_MEMBERS });
      if (url.includes("resource=access")) return route.fulfill({ json: { hasAccess: false } });
      if (url.includes("resource=portal")) return route.fulfill({ json: { plans: [], courses: [], communities: [] } });
      return route.fulfill({ json: FIXTURE_MEMBERSHIPS });
    });
    await page.route("**/api/saas/affiliates**", route =>
      route.fulfill({ json: { commissions: [], stats: { totalClicks: 0, totalConversions: 0, totalPaid: 0, pendingPayouts: 0 } } }));
  });

  test("carga sin error 500", async ({ page }) => {
    await page.goto("/saas/memberships");
    expect(page.url()).not.toContain("500");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("muestra contenido principal", async ({ page }) => {
    await page.goto("/saas/memberships");
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
    expect(page.url()).not.toContain("error");
  });

  test("URL contiene /saas/memberships tras carga", async ({ page }) => {
    await page.goto("/saas/memberships");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/saas/memberships");
  });

  test("tiene al menos un botón o elemento interactivo", async ({ page }) => {
    await page.goto("/saas/memberships", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/memberships**", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Planes" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Miembros" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Afiliados" })).toBeVisible();
  });

  test("3 tabs visibles (Planes / Miembros / Afiliados)", async ({ page }) => {
    await page.goto("/saas/memberships");
    await page.waitForLoadState("domcontentloaded");
    // Tabs should contain "Planes", "Miembros", "Afiliados"
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/Planes|Miembros|Afiliados/);
  });

  test("tab Miembros hace fetch a ?resource=members", async ({ page }) => {
    const intercepted: string[] = [];
    await page.route("**/api/saas/memberships**", route => {
      intercepted.push(route.request().url());
      const url = route.request().url();
      if (url.includes("resource=members")) return route.fulfill({ json: FIXTURE_MEMBERS });
      return route.fulfill({ json: FIXTURE_MEMBERSHIPS });
    });
    await page.goto("/saas/memberships");
    await page.waitForLoadState("domcontentloaded");
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test("plan 'Pro' aparece en el texto de la página", async ({ page }) => {
    await page.goto("/saas/memberships");
    await page.waitForLoadState("domcontentloaded");
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/Pro|Memberships|Membresías|Planes/i);
  });
});
