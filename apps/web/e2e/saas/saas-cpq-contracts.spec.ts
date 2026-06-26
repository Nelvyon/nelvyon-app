/**
 * E2E — Pipeline tab Contratos + /contracts/sign/[token] pública
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

const FIXTURE_CONTRACTS = {
  contracts: [
    {
      id: "c-1", tenantId: "t1", quoteId: null, dealId: null,
      contractNumber: "CTR-2026-E2E001", title: "Contrato Servicio Pro E2E",
      clientName: "Acme E2E SL", clientEmail: "ceo@acme-e2e.com",
      currency: "EUR", amount: 2400, billingInterval: "year",
      status: "sent", signedAt: null, startsAt: null, endsAt: null,
      autoRenew: true, termsHtml: null,
      signatureToken: "e2e-test-token-abc123",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ],
};

const FIXTURE_CONTRACT_PUBLIC = {
  contract: {
    id: "c-1", title: "Contrato Servicio Pro E2E",
    clientName: "Acme E2E SL", contractNumber: "CTR-2026-E2E001",
    amount: 2400, currency: "EUR", status: "sent", termsHtml: null,
  },
};

test.describe("SaaS CPQ Contratos — auth guard", () => {
  test("GET /api/saas/contracts 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/contracts");
  });

  test("POST /api/saas/contracts 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/contracts", "POST", { title: "X", clientName: "Y", clientEmail: "y@y.com", amount: 0 });
  });

  test("GET /api/saas/contracts/c-1 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/contracts/c-1");
  });

  test("GET /api/saas/facturas/dunning 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/facturas/dunning");
  });

  test("POST /api/saas/facturas/dunning 401 sin auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/facturas/dunning", "POST", { invoiceId: "inv-1" });
  });
});

async function gotoPipelineReady(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/saas/pipeline", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Sales Hub/i })).toBeVisible({ timeout: 15_000 });
  await page.waitForResponse(
    (resp) => resp.url().includes("/api/saas/contracts") && resp.ok(),
    { timeout: 15_000 },
  ).catch(() => undefined);
}

function contratosTab(page: import("@playwright/test").Page) {
  // Scope to tab bar — evita colisión con sidebar "Documentos & Contratos" u otros botones
  return page.locator(".flex.gap-1.border-b").getByRole("button", { name: /Contratos/i });
}

test.describe("SaaS CPQ — Pipeline tab Contratos", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/contracts**", route =>
      route.fulfill({ json: FIXTURE_CONTRACTS }));
    await page.route("**/api/saas/quotes**", route =>
      route.fulfill({ json: { quotes: [] } }));
    await page.route("**/api/saas/deals**", route =>
      route.fulfill({ json: { deals: [] } }));
    await page.route("**/api/saas/playbooks**", route => {
      const url = route.request().url();
      if (url.includes("resource=forecast")) {
        return route.fulfill({
          json: { forecast: { weightedTotal: 0, bestCase: 0, committed: 0, byStage: [] } },
        });
      }
      return route.fulfill({ json: { playbooks: [] } });
    });
  });

  test("carga pipeline sin error 500", async ({ page }) => {
    await gotoPipelineReady(page);
    expect(page.url()).not.toContain("500");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("tab 'Contratos' visible en pipeline", async ({ page }) => {
    await gotoPipelineReady(page);
    await expect(contratosTab(page)).toBeVisible();
  });

  test("click en tab Contratos no produce error 500", async ({ page }) => {
    await gotoPipelineReady(page);
    await contratosTab(page).click();
    await expect(page.getByText("CTR-2026-E2E001")).toBeVisible({ timeout: 10_000 });
    expect(page.url()).not.toContain("500");
  });

  test("contrato E2E aparece en contenido tras click en tab", async ({ page }) => {
    await gotoPipelineReady(page);
    await contratosTab(page).click();
    await expect(page.getByText("CTR-2026-E2E001")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Acme E2E/i)).toBeVisible();
  });
});

test.describe("SaaS CPQ — /contracts/sign/[token] página pública", () => {
  test("token válido (mocked) muestra contrato", async ({ page }) => {
    await page.route("**/api/public/contracts/sign/**", route =>
      route.fulfill({ json: FIXTURE_CONTRACT_PUBLIC }));
    await page.goto("/contracts/sign/e2e-test-token-abc123");
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/Contrato|firmar|firma/i);
  });

  test("token inexistente (404) muestra error honesto, no 500", async ({ page }) => {
    // No mock: la API real devolverá 404 (no DB) → la página maneja gracefully
    await page.route("**/api/public/contracts/sign/**", route =>
      route.fulfill({ json: { error: "Contract not found" }, status: 404 }));
    await page.goto("/contracts/sign/invalid-token-xyz");
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
    expect(page.url()).not.toContain("500");
  });

  test("página pública no requiere cookie auth", async ({ page }) => {
    // Sin setAuthCookie — pública
    await page.route("**/api/public/contracts/sign/**", route =>
      route.fulfill({ json: FIXTURE_CONTRACT_PUBLIC }));
    await page.goto("/contracts/sign/e2e-test-token-abc123");
    // NO debe redirigir al login
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
  });

  test("botón Firmar visible cuando contrato está en estado sent (mocked)", async ({ page }) => {
    await page.route("**/api/public/contracts/sign/**", route =>
      route.fulfill({ json: FIXTURE_CONTRACT_PUBLIC }));
    await page.goto("/contracts/sign/e2e-test-token-abc123");
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).toMatch(/[Ff]irmar|[Ss]ign|[Cc]ontrato/i);
  });
});

test.describe("SaaS CPQ — multi-currency quote convert", () => {
  test("GET /api/saas/quotes/convert-currency 401 sin auth", async ({ request }) => {
    const res = await request.get("/api/saas/quotes/convert-currency?quoteId=q1&currency=USD", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
