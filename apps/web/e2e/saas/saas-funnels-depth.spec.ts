import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, mockSaasFunnelsDepth, gotoAwaitingApi } from "./fixtures";

test.describe("SaaS Funnels — depth (S36)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await mockSaasFunnelsDepth(page);
  });

  test("builder carga con lista de funnels y KPIs", async ({ page }) => {
    await gotoAwaitingApi(page, "/saas/funnels", "/api/saas/funnels");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText("E2E Test Funnel")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Abrir builder" })).toBeVisible();
  });

  test("tab analytics se muestra al entrar al builder", async ({ page }) => {
    await gotoAwaitingApi(page, "/saas/funnels", "/api/saas/funnels");
    await expect(page.getByRole("button", { name: "Abrir builder" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Abrir builder" }).click();
    await expect(page.getByRole("button", { name: "Analytics" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Analytics" }).click();
    await expect(page.getByText("Visitas totales")).toBeVisible({ timeout: 10_000 });
    // Los pasos se verifican en su fila de la tabla de rendimiento, no como
    // texto suelto del documento. El sidebar expone un enlace "Formularios"
    // —oculto, con su grupo plegado— que contiene "Formulario" como subcadena y
    // precede en el DOM al dato real, asi que `.first()` lo elegia y el assert
    // fallaba por `hidden`. Anclar a la fila describe lo que el test verifica de
    // verdad: que el paso figura en Analytics.
    await expect(page.getByRole("row", { name: /Landing Page/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Formulario/ })).toBeVisible();
  });

  test("public funnel 404 sin slug válido", async ({ request }) => {
    const res = await request.get("/api/public/funnel/no-such-slug-xyz", { maxRedirects: 0 });
    expect([404, 500]).toContain(res.status());
  });
});
