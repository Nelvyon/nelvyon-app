/**
 * S53 — E2E: Data Playbooks
 */
import { expect, test } from "@playwright/test";
import { setupAuthedSaas, mockDataPlaybooks, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

test.describe("S53 — /saas/playbooks page", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
    await mockDataPlaybooks(page);
  });

  test("page loads without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/saas/playbooks", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("header visible", async ({ page }) => {
    await page.goto("/saas/playbooks", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Playbooks/ })).toBeVisible({ timeout: 10_000 });
  });

  test("summary KPIs render", async ({ page }) => {
    await page.goto("/saas/playbooks", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sugeridos")).toBeVisible({ timeout: 10_000 });
  });

  test("Actualizar button visible", async ({ page }) => {
    await page.goto("/saas/playbooks", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Actualizar/i })).toBeVisible();
  });

  test("nav sidebar shows Playbooks item", async ({ page }) => {
    await page.goto("/saas/playbooks", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Playbooks/i })).toBeVisible();
  });

  test("playbook cards render titles and triggers", async ({ page }) => {
    await page.goto("/saas/playbooks", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Mejora la apertura de tus emails")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Lanza tu primer pack de crecimiento")).toBeVisible();
  });

  test("expanding shows steps", async ({ page }) => {
    await page.goto("/saas/playbooks", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Ver pasos/i }).first().click();
    await expect(page.getByText(/Diagnóstico|Reescribe 3 asuntos/).first()).toBeVisible({ timeout: 8000 });
  });

  test("Activar and Descartar buttons present", async ({ page }) => {
    await page.goto("/saas/playbooks", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Activar/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /Descartar/i }).first()).toBeVisible();
  });
});

test.describe("S53 — Data Playbooks API auth", () => {
  test("GET /api/saas/data-playbooks requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/data-playbooks");
  });

  test("POST /api/saas/data-playbooks/refresh requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/data-playbooks/refresh", "POST", {});
  });

  test("GET /api/saas/data-playbooks/[id] requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/data-playbooks/test-id");
  });
});
