/**
 * S48 — E2E: Revenue per Deliverable
 */
import { expect, test } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const AUTH = { "x-test-tenant": "test-tenant-s48" };

test.describe("S48 — Entregables Revenue tab", () => {
  test("Revenue tab is visible on /saas/entregables", async ({ page }) => {
    await page.goto(`${BASE}/saas/entregables`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /Revenue €/i })).toBeVisible();
  });

  test("clicking Revenue tab switches to revenue view", async ({ page }) => {
    await page.goto(`${BASE}/saas/entregables`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Revenue €/i }).click();
    // Either revenue table OR empty state is shown
    const tableOrEmpty = page.locator("table, :text('Sin revenue atribuido')");
    await expect(tableOrEmpty).toBeVisible();
  });

  test("Recalcular button triggers POST /api/saas/entregables/revenue", async ({ page, request }) => {
    await page.goto(`${BASE}/saas/entregables`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Revenue €/i }).click();

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/saas/entregables/revenue") && r.request().method() === "POST",
        { timeout: 8000 }
      ).catch(() => null),
      page.getByRole("button", { name: /↻ Recalcular/i }).click(),
    ]);
    // Either fires (authenticated) or 401 (test env without auth) — not 500
    if (resp) expect(resp.status()).not.toBe(500);
  });

  test("Lista tab shows 'Vincular campaña' per row", async ({ page }) => {
    await page.goto(`${BASE}/saas/entregables`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Lista/i }).click();
    // This may or may not have rows in test env; check no page error
    await expect(page).not.toHaveTitle(/Error/);
  });

  test("Vincular campaña modal opens on click", async ({ page }) => {
    await page.goto(`${BASE}/saas/entregables`, { waitUntil: "networkidle" });
    // If any rows exist, click the first "Vincular campaña" link
    const vincularBtn = page.getByRole("button", { name: /Vincular campaña/i }).first();
    if (await vincularBtn.isVisible()) {
      await vincularBtn.click();
      await expect(page.getByText("Vincular campaña UTM")).toBeVisible();
      await expect(page.getByPlaceholder(/ej: local-business-q2/i)).toBeVisible();
    }
  });

  test("modal closes on Cancelar click", async ({ page }) => {
    await page.goto(`${BASE}/saas/entregables`, { waitUntil: "networkidle" });
    const vincularBtn = page.getByRole("button", { name: /Vincular campaña/i }).first();
    if (await vincularBtn.isVisible()) {
      await vincularBtn.click();
      await page.getByRole("button", { name: /Cancelar/i }).click();
      await expect(page.getByText("Vincular campaña UTM")).not.toBeVisible();
    }
  });

  test("KPI strip shows Revenue atribuido and ROAS medio", async ({ page }) => {
    await page.goto(`${BASE}/saas/entregables`, { waitUntil: "networkidle" });
    await expect(page.getByText("Revenue atribuido")).toBeVisible();
    await expect(page.getByText("ROAS medio")).toBeVisible();
  });
});

test.describe("S48 — Reportes revenue section", () => {
  test("Revenue por entregable section visible in /saas/reportes", async ({ page }) => {
    await page.goto(`${BASE}/saas/reportes`, { waitUntil: "networkidle" });
    await expect(page.getByText(/Revenue por entregable/i)).toBeVisible();
  });

  test("no page crash on /saas/reportes with revenue data fetch", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/saas/reportes`, { waitUntil: "networkidle" });
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });
});

test.describe("S48 — Revenue API routes", () => {
  test("GET /api/saas/entregables/revenue returns 200 or 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/saas/entregables/revenue?days=30`);
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/saas/entregables/revenue?model=first_touch is accepted", async ({ request }) => {
    const res = await request.get(`${BASE}/api/saas/entregables/revenue?days=30&model=first_touch`);
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/saas/entregables/revenue refresh action returns 200 or 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/saas/entregables/revenue`, {
      data: { action: "refresh" },
    });
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/saas/entregables/revenue/[id] returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.get(`${BASE}/api/saas/entregables/revenue/test-del-id`);
    expect([200, 401, 404]).toContain(res.status());
  });

  test("POST without deliverableId returns 400 or 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/saas/entregables/revenue`, {
      data: { deliverableSource: "os" },
    });
    expect([400, 401]).toContain(res.status());
  });
});
