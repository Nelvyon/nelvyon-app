/**
 * S54 — E2E: Partner Zone
 */
import { expect, test } from "@playwright/test";
import { setupAuthedSaas, mockPartnerZone, expectUnauthorizedApi, LOGIN_URL, gotoAwaitingApi, esperarAppLista } from "./fixtures";

test.describe("S54 — /saas/partner page", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
    await mockPartnerZone(page);
  });

  test("page loads without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/saas/partner", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("header Partner Zone visible", async ({ page }) => {
    await page.goto("/saas/partner", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Partner Zone/ })).toBeVisible({ timeout: 10_000 });
  });

  test("tabs render", async ({ page }) => {
    await page.goto("/saas/partner", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Wholesale" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Ledger" })).toBeVisible();
  });

  test("resumen KPIs render margin", async ({ page }) => {
    await page.goto("/saas/partner", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Margen acumulado")).toBeVisible({ timeout: 10_000 });
  });

  test("nav sidebar shows Partner Zone item", async ({ page }) => {
    await page.goto("/saas/partner", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Partner Zone/i })).toBeVisible();
  });

  test("wholesale tab shows catalog SKUs", async ({ page }) => {
    await gotoAwaitingApi(page, "/saas/partner", "/api/saas/partner");
    await esperarAppLista(page);
    await page.getByRole("button", { name: "Wholesale" }).click();
    await expect(page.getByText("Plan Pro")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Pack Crecimiento Local")).toBeVisible();
  });

  test("ledger tab shows totals", async ({ page }) => {
    await page.goto("/saas/partner", { waitUntil: "domcontentloaded" });

    // La cabecera "Bruto" solo existe si `ledger.length > 0`, y eso depende de
    // que resuelva el fetch a `/api/saas/partner/ledger`, que a su vez solo se
    // dispara si el clic llega DESPUES de la hidratacion. Con `domcontentloaded`
    // el clic podia caer antes de que React enganchase los manejadores: la
    // pestana no cambiaba, el fetch nunca salia y la columna no aparecia jamas.
    //
    // `esperarAppLista` es la puerta de hidratacion compartida (ver fixtures):
    // sin ella el clic caia sobre el HTML del servidor, sin manejador, y el
    // `waitForResponse` de mas abajo expiraba porque el fetch nunca salia.
    await esperarAppLista(page);

    const ledger = page.getByRole("button", { name: "Ledger" });
    await expect(ledger).toBeVisible({ timeout: 10_000 });

    const respuestaLedger = page.waitForResponse(
      (r) => r.url().includes("/api/saas/partner/ledger"),
      { timeout: 15_000 },
    );
    await ledger.click();
    await respuestaLedger;

    await expect(page.getByRole("columnheader", { name: "Bruto" })).toBeVisible({ timeout: 8000 });
  });

  test("referidos tab shows referral code", async ({ page }) => {
    await gotoAwaitingApi(page, "/saas/partner", "/api/saas/partner");
    await esperarAppLista(page);
    await page.getByRole("button", { name: "Referidos" }).click();
    await expect(page.getByText("AGENCY99")).toBeVisible({ timeout: 8000 });
  });

  test("connect tab shows status", async ({ page }) => {
    await gotoAwaitingApi(page, "/saas/partner", "/api/saas/partner");
    await esperarAppLista(page);
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByText("Charges habilitados")).toBeVisible({ timeout: 8000 });
  });
});

test.describe("S54 — Partner Zone API auth", () => {
  test("GET /api/saas/partner requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/partner");
  });

  test("GET /api/saas/partner/ledger requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/partner/ledger");
  });

  test("POST /api/saas/partner/connect/onboard requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/partner/connect/onboard", "POST", {});
  });
});
