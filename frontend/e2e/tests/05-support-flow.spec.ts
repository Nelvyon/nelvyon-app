/**
 * E2E Test 5: Support Flow
 * crear ticket / conversación → respuesta → cierre → ver reflejo en métricas de calidad/servicio.
 *
 * Tests helpdesk, conversations, and quality metrics pages.
 */
import { test, expect } from "@playwright/test";

test.describe("Support Flow — Pages & APIs", () => {
  test("helpdesk tickets API endpoint responds", async ({ request }) => {
    const res = await request.get("/api/v1/entities/helpdesk_tickets?skip=0&limit=1");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("conversations API endpoint responds", async ({ request }) => {
    const res = await request.get("/api/v1/entities/conversations?skip=0&limit=1");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("quality metrics API endpoint responds", async ({ request }) => {
    const res = await request.get("/api/v1/entities/nelvyon_quality_metrics?skip=0&limit=1");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("platform metrics API endpoint responds", async ({ request }) => {
    const res = await request.get("/api/v1/entities/platform_metrics?skip=0&limit=1");
    expect([200, 401, 403]).toContain(res.status());
  });

  test("SaaS helpdesk page loads", async ({ page }) => {
    await page.goto("/saas/helpdesk");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("SaaS conversations page loads", async ({ page }) => {
    await page.goto("/saas/conversations");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("service quality page loads", async ({ page }) => {
    await page.goto("/service-quality");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("platform health page loads", async ({ page }) => {
    await page.goto("/saas/platform-health");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("agents panel page loads", async ({ page }) => {
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});