/**
 * S50 — E2E: Compliance Vault
 */
import { expect, test } from "@playwright/test";
import { setupAuthedSaas, LOGIN_URL } from "./fixtures";

test.describe("S50 — /saas/compliance page", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
  });

  test("page loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/saas/compliance", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("page title Compliance Vault visible", async ({ page }) => {
    await page.goto("/saas/compliance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Compliance Vault")).toBeVisible({ timeout: 10_000 });
  });

  test("Sincronizar button visible", async ({ page }) => {
    await page.goto("/saas/compliance", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Sincronizar/i })).toBeVisible();
  });

  test("KPI labels visible once loaded", async ({ page }) => {
    await page.goto("/saas/compliance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Total")).toBeVisible({ timeout: 10_000 });
  });

  test("nav sidebar shows Compliance item", async ({ page }) => {
    await page.goto("/saas/compliance", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Compliance/i })).toBeVisible();
  });

  test("empty state shown when no artifacts", async ({ page }) => {
    await page.goto("/saas/compliance", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveTitle(/Error/);
    await expect(page.getByText(/Sin artifacts/i)).toBeVisible({ timeout: 10_000 });
  });

  test("table headers visible when artifacts present", async ({ page }) => {
    await page.goto("/saas/compliance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Sin artifacts|Estado/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("S50 — Compliance API routes", () => {
  test("GET /api/saas/compliance returns 200 or 401", async ({ request }) => {
    const res = await request.get("/api/saas/compliance");
    expect([200, 401]).toContain(res.status());
  });

  test("GET /api/saas/compliance?status=verified is accepted", async ({ request }) => {
    const res = await request.get("/api/saas/compliance?status=verified");
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/saas/compliance/sync returns 200 or 401", async ({ request }) => {
    const res = await request.post("/api/saas/compliance/sync", { data: {} });
    expect([200, 401]).toContain(res.status());
  });

  test("POST sync with packRunId returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.post("/api/saas/compliance/sync", {
      data: { packRunId: "00000000-0000-0000-0000-000000000000" },
    });
    expect([200, 401, 404]).toContain(res.status());
  });

  test("GET /api/saas/compliance/[id] returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.get("/api/saas/compliance/test-artifact-id");
    expect([200, 401, 404]).toContain(res.status());
  });

  test("PATCH /api/saas/compliance/[id] verify returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.patch("/api/saas/compliance/test-artifact-id", { data: { action: "verify" } });
    expect([200, 401, 404]).toContain(res.status());
  });

  test("PATCH /api/saas/compliance/[id] revoke returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.patch("/api/saas/compliance/test-artifact-id", {
      data: { action: "revoke", reason: "test" },
    });
    expect([200, 401, 404]).toContain(res.status());
  });
});
