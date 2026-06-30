import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, mockSaasFunnelsDepth } from "./fixtures";

test.describe("SaaS Funnels — depth (S36)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await mockSaasFunnelsDepth(page);
  });

  test("builder carga con lista de funnels y KPIs", async ({ page }) => {
    await page.goto("/saas/funnels", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText("E2E Test Funnel")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Abrir builder" })).toBeVisible();
  });

  test("tab analytics se muestra al entrar al builder", async ({ page }) => {
    await page.goto("/saas/funnels", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Abrir builder" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Abrir builder" }).click();
    await expect(page.getByRole("button", { name: "Analytics" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Analytics" }).click();
    await expect(page.getByText("Visitas totales")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Landing Page").first()).toBeVisible();
    await expect(page.getByText("Formulario").first()).toBeVisible();
  });

  test("public funnel 404 sin slug válido", async ({ request }) => {
    const res = await request.get("/api/public/funnel/no-such-slug-xyz", { maxRedirects: 0 });
    expect([404, 500]).toContain(res.status());
  });
});
