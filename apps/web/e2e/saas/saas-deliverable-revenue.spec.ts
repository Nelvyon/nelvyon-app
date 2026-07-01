/**
 * S48 — E2E: Revenue per Deliverable
 */
import { expect, test } from "@playwright/test";
import { setupAuthedSaas, mockEntregablesList, mockEntregablesRevenue } from "./fixtures";

const FIXTURE_ENTREGABLES = {
  deliverables: [
    {
      id: "d-1", source: "os", type: "landing", title: "Landing ACME E2E",
      packId: "local-business-growth", status: "approved",
      qaScore: 91, legalPassed: true,
      downloadUrl: null, portalUrl: null,
      createdAt: new Date().toISOString(), approvedAt: new Date().toISOString(),
    },
  ],
  summary: { total: 1, pendingReview: 0, approved: 1, avgQaScore: 91, byType: {}, byStatus: {} },
};

async function gotoEntregablesReady(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/saas/entregables", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Revenue €|Lista/i }).first()).toBeVisible({ timeout: 15_000 });
}

test.describe("S48 — Entregables Revenue tab", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
    await mockEntregablesRevenue(page);
    await mockEntregablesList(page, FIXTURE_ENTREGABLES);
  });

  test("Revenue tab is visible on /saas/entregables", async ({ page }) => {
    await gotoEntregablesReady(page);
    await expect(page.getByRole("button", { name: /Revenue €/i })).toBeVisible();
  });

  test("clicking Revenue tab switches to revenue view", async ({ page }) => {
    await gotoEntregablesReady(page);
    await page.getByRole("button", { name: /Revenue €/i }).click();
    const tableOrEmpty = page.getByText(/Sin revenue atribuido|Revenue atribuido/i).first();
    await expect(tableOrEmpty).toBeVisible();
  });

  test("Recalcular button triggers POST /api/saas/entregables/revenue", async ({ page }) => {
    await gotoEntregablesReady(page);
    await page.getByRole("button", { name: /Revenue €/i }).click();
    await expect(page.getByText(/Sin revenue atribuido|Calculando revenue/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const recalc = page.getByRole("button", { name: /Recalcular/i });
    await expect(recalc).toBeVisible({ timeout: 15_000 });

    const cookieOk = page.getByRole("button", { name: /Aceptar todo|Solo necesarias/i }).first();
    if (await cookieOk.isVisible().catch(() => false)) {
      await cookieOk.click();
    }

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/saas/entregables/revenue") && r.request().method() === "POST",
        { timeout: 15_000 },
      ),
      recalc.click(),
    ]);
    expect(resp.status()).not.toBe(500);
  });

  test("Lista tab shows deliverable row", async ({ page }) => {
    await gotoEntregablesReady(page);
    await page.getByRole("button", { name: /Lista/i }).click();
    await expect(page.getByText("Landing ACME E2E")).toBeVisible();
  });

  test("Vincular campaña modal opens on click", async ({ page }) => {
    await gotoEntregablesReady(page);
    await page.getByRole("button", { name: /Lista/i }).click();
    const vincularBtn = page.getByRole("button", { name: /Vincular campaña/i }).first();
    await vincularBtn.click();
    await expect(page.getByText("Vincular campaña UTM")).toBeVisible();
  });

  test("modal closes on Cancelar click", async ({ page }) => {
    await gotoEntregablesReady(page);
    await page.getByRole("button", { name: /Lista/i }).click();
    await page.getByRole("button", { name: /Vincular campaña/i }).first().click();
    await page.getByRole("button", { name: /Cancelar/i }).click();
    await expect(page.getByText("Vincular campaña UTM")).not.toBeVisible();
  });

  test("KPI strip shows Revenue atribuido and ROAS medio", async ({ page }) => {
    await gotoEntregablesReady(page);
    await expect(page.getByText("Revenue atribuido")).toBeVisible();
    await expect(page.getByText("ROAS medio")).toBeVisible();
  });
});

test.describe("S48 — Reportes revenue section", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
  });

  test("Revenue por entregable section visible in /saas/reportes", async ({ page }) => {
    await page.goto("/saas/reportes", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Revenue por entregable/i)).toBeVisible({ timeout: 15_000 });
  });

  test("no page crash on /saas/reportes with revenue data fetch", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/saas/reportes", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });
});

test.describe("S48 — Revenue API routes", () => {
  test("GET /api/saas/entregables/revenue returns 200 or 401", async ({ request }) => {
    const res = await request.get("/api/saas/entregables/revenue?days=30");
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/saas/entregables/revenue?model=first_touch is accepted", async ({ request }) => {
    const res = await request.get("/api/saas/entregables/revenue?days=30&model=first_touch");
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/saas/entregables/revenue refresh action returns 200 or 401", async ({ request }) => {
    const res = await request.post("/api/saas/entregables/revenue", {
      data: { action: "refresh" },
    });
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/saas/entregables/revenue/[id] returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.get("/api/saas/entregables/revenue/test-del-id");
    expect([200, 401, 404]).toContain(res.status());
  });

  test("POST without deliverableId returns 400 or 401", async ({ request }) => {
    const res = await request.post("/api/saas/entregables/revenue", {
      data: { deliverableSource: "os" },
    });
    expect([400, 401]).toContain(res.status());
  });
});
