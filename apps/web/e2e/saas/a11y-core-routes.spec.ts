import { test, expect } from "@playwright/test";

import { setupAuthedSaas } from "./fixtures";

const CRITICAL_SAAS_ROUTES = [
  "/saas/dashboard",
  "/saas/crm",
  "/saas/campanias",
  "/saas/workflows",
  "/saas/billing",
  "/saas/integraciones",
];

test.beforeEach(async ({ page, context }) => {
  await setupAuthedSaas(page, context);
});

for (const route of CRITICAL_SAAS_ROUTES) {
  test(`a11y landmarks: ${route} has main navigation`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    // Acotado a `main`: mientras React transmite la pagina por streaming, el
    // contenido existe un instante por duplicado —en su posicion real dentro de
    // `main` y en el contenedor temporal `div#S:1`, colgado de `<body>`— hasta
    // que React lo mueve con `$RC()`. `getByTestId` en modo estricto cuenta
    // elementos adjuntos aunque esten ocultos, asi que sin acotar fallaba con
    // "resolved to 2 elements" segun quien ganase la carrera. Se sigue exigiendo
    // que el sidebar exista y sea visible en su sitio.
    await expect(page.locator("main [data-testid='saas-sidebar']")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("nav, [role='navigation']").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 15_000 });
  });
}

test("publicidad connect form has accessible labels", async ({ page }) => {
  await page.goto("/saas/publicidad", { waitUntil: "domcontentloaded" });
  const connectBtn = page.getByRole("button", { name: /conectar cuenta/i });
  if (await connectBtn.isVisible()) {
    await connectBtn.click();
    await expect(page.getByLabel(/account id/i)).toBeVisible();
  }
});
