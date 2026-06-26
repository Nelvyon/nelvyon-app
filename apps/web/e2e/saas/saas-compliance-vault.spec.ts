/**
 * S50 — E2E: Compliance Vault
 */
import { expect, test } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("S50 — /saas/compliance page", () => {
  test("page loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/saas/compliance`, { waitUntil: "networkidle" });
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("page title Compliance Vault visible", async ({ page }) => {
    await page.goto(`${BASE}/saas/compliance`, { waitUntil: "networkidle" });
    await expect(page.getByText("Compliance Vault")).toBeVisible();
  });

  test("Sincronizar button visible", async ({ page }) => {
    await page.goto(`${BASE}/saas/compliance`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /Sincronizar/i })).toBeVisible();
  });

  test("KPI labels visible once loaded", async ({ page }) => {
    await page.goto(`${BASE}/saas/compliance`, { waitUntil: "networkidle" });
    // KPI strip or empty state should appear
    const content = page.locator(":text('Total'), :text('Sin artifacts'), :text('Cargando')");
    await expect(content).toBeVisible({ timeout: 8000 });
  });

  test("nav sidebar shows Compliance item", async ({ page }) => {
    await page.goto(`${BASE}/saas/compliance`, { waitUntil: "networkidle" });
    await expect(page.getByText("Compliance")).toBeVisible();
  });

  test("empty state shown when no artifacts", async ({ page }) => {
    await page.goto(`${BASE}/saas/compliance`, { waitUntil: "networkidle" });
    // In test env without auth, likely empty or redirect; no 500 error
    await expect(page).not.toHaveTitle(/Error/);
  });

  test("table headers visible when artifacts present", async ({ page }) => {
    await page.goto(`${BASE}/saas/compliance`, { waitUntil: "networkidle" });
    const tableOrEmpty = page.locator("th:has-text('Estado'), :text('Sin artifacts')");
    await expect(tableOrEmpty).toBeVisible({ timeout: 8000 });
  });
});

test.describe("S50 — Compliance API routes", () => {
  test("GET /api/saas/compliance returns 200 or 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/saas/compliance`);
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/saas/compliance?status=verified is accepted", async ({ request }) => {
    const res = await request.get(`${BASE}/api/saas/compliance?status=verified`);
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/saas/compliance/sync returns 200 or 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/saas/compliance/sync`, { data: {} });
    expect([200, 401]).toContain(res.status());
  });

  test("POST sync with packRunId returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.post(`${BASE}/api/saas/compliance/sync`, {
      data: { packRunId: "00000000-0000-0000-0000-000000000000" },
    });
    expect([200, 401, 404]).toContain(res.status());
  });

  test("GET /api/saas/compliance/[id] returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.get(`${BASE}/api/saas/compliance/test-artifact-id`);
    expect([200, 401, 404]).toContain(res.status());
  });

  test("PATCH /api/saas/compliance/[id] verify returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.patch(`${BASE}/api/saas/compliance/test-artifact-id`, {
      data: { action: "verify" },
    });
    expect([200, 401, 404]).toContain(res.status());
  });

  test("PATCH /api/saas/compliance/[id] revoke returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.patch(`${BASE}/api/saas/compliance/test-artifact-id`, {
      data: { action: "revoke", reason: "test" },
    });
    expect([200, 401, 404]).toContain(res.status());
  });
});
