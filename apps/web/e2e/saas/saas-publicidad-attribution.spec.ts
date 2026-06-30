/**
 * E2E — /saas/publicidad (attribution tab + ad platform status)
 */
import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, LOGIN_URL } from "./fixtures";

async function gotoPublicidadReady(page: import("@playwright/test").Page): Promise<void> {
  await page.route("**/api/saas/ads/attribution**", route =>
    route.fulfill({ json: { roas: [] } }));
  await page.goto("/saas/publicidad", { waitUntil: "domcontentloaded" });
  await page.waitForResponse("**/api/saas/ads**", { timeout: 15_000 }).catch(() => {});
  await expect(page.getByRole("heading", { name: "Publicidad Digital" })).toBeVisible({ timeout: 15_000 });
}

test.describe("SaaS Publicidad — auth guard", () => {
  test("GET /saas/publicidad sin token → redirect /login", async ({ page }) => {
    await page.goto("/saas/publicidad");
    await expect(page).toHaveURL(LOGIN_URL);
  });
});

test.describe("SaaS Publicidad — página autenticada", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/ads/attribution**", route =>
      route.fulfill({ json: { roas: [] } }));
  });

  test("carga sin error 500", async ({ page }) => {
    await gotoPublicidadReady(page);
    expect(page.url()).not.toContain("500");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await expect(page.locator("body")).toBeVisible();
  });

  test("URL contiene /saas/publicidad", async ({ page }) => {
    await gotoPublicidadReady(page);
    expect(page.url()).toContain("/saas/publicidad");
  });

  test("contenido principal visible", async ({ page }) => {
    await gotoPublicidadReady(page);
    await expect(page.locator("body")).toBeVisible({ timeout: 8000 });
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("texto de Publicidad o Atribución en página", async ({ page }) => {
    await gotoPublicidadReady(page);
    await expect(page.getByRole("button", { name: /Métricas y campañas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Atribución multi-touch/i })).toBeVisible();
  });

  test("no redirige a /login con cookie válida", async ({ page }) => {
    await gotoPublicidadReady(page);
    await expect(page).not.toHaveURL(LOGIN_URL);
  });

  test("tiene elemento interactivo (tab o botón)", async ({ page }) => {
    await gotoPublicidadReady(page);
    const buttons = page.locator("button, [role='tab']");
    await expect(buttons.first()).toBeVisible();
  });
});

test.describe("SaaS Publicidad — atribución multi-touch", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/ads/attribution**", route =>
      route.fulfill({ json: { roas: [] } }));
  });

  test("página carga datos sin 500 tras navegar desde pipeline", async ({ page }) => {
    await page.goto("/saas/pipeline", { waitUntil: "domcontentloaded" });
    await page.goto("/saas/publicidad", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Publicidad Digital")).toBeVisible({ timeout: 15_000 });
    expect(page.url()).not.toContain("500");
  });

  test("header de sección contiene texto de publicidad digital", async ({ page }) => {
    await gotoPublicidadReady(page);
    await expect(page.getByRole("heading", { name: "Publicidad Digital" })).toBeVisible();
  });

  test("tab atribución carga sin crash", async ({ page }) => {
    await gotoPublicidadReady(page);
    await page.getByRole("button", { name: /Atribución multi-touch/i }).click();
    await page.waitForResponse("**/api/saas/ads/attribution**", { timeout: 15_000 });
    await expect(
      page.getByText(/Sin campañas vinculadas/i).or(page.getByLabel(/Modelo/i)),
    ).toBeVisible({ timeout: 10_000 });
    expect(page.url()).not.toContain("500");
  });
});
