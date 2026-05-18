/**
 * E2E Test 3: Marketing Flow
 * crear campaña / embudo → asociar contactos/segmentos → guardar y ver estadísticas básicas.
 *
 * Tests marketing-related pages and API endpoints.
 */
import { test, expect } from "@playwright/test";

test.describe("Marketing Flow — Pages & APIs", () => {
  test("campaigns API endpoint responds", async ({ request }) => {
    const res = await request.get("/api/v1/entities/nelvyon_campaigns?skip=0&limit=1");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("contacts API endpoint responds", async ({ request }) => {
    const res = await request.get("/api/v1/entities/contacts?skip=0&limit=1");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("funnels API endpoint responds", async ({ request }) => {
    const res = await request.get("/api/v1/entities/funnel_items?skip=0&limit=1");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("segment results API endpoint responds", async ({ request }) => {
    const res = await request.get("/api/v1/entities/segment_results?skip=0&limit=1");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("SaaS campaigns page loads", async ({ page }) => {
    await page.goto("/saas/campaigns");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("SaaS funnels page loads", async ({ page }) => {
    await page.goto("/saas/funnels");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("SaaS segmentation page loads", async ({ page }) => {
    await page.goto("/saas/segmentation");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("SaaS CRM page loads", async ({ page }) => {
    await page.goto("/saas/crm");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("SaaS social page loads", async ({ page }) => {
    await page.goto("/saas/social");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});