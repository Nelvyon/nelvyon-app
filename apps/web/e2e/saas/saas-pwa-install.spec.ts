/**
 * S56 — E2E: SaaS PWA install hub (dynamic manifest + white-label)
 */
import { expect, test } from "@playwright/test";
import { setupAuthedSaas, mockSaasPwa, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

test.describe("S56 — /saas/pwa install hub", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
    await mockSaasPwa(page);
  });

  test("page loads without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/saas/pwa", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("header visible", async ({ page }) => {
    await page.goto("/saas/pwa", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Instalar/ })).toBeVisible({ timeout: 10_000 });
  });

  test("status card shows install state", async ({ page }) => {
    await page.goto("/saas/pwa", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Estado")).toBeVisible({ timeout: 10_000 });
  });

  test("install stats render", async ({ page }) => {
    await page.goto("/saas/pwa", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Instalaciones")).toBeVisible({ timeout: 10_000 });
  });

  test("nav sidebar shows Instalar App item", async ({ page }) => {
    await page.goto("/saas/pwa", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Instalar App/i })).toBeVisible();
  });

  test("fallback manifest note visible", async ({ page }) => {
    await page.goto("/saas/pwa", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/manifest-saas\.json/)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("S56 — PWA API auth", () => {
  test("GET /api/saas/pwa/status requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/pwa/status");
  });

  test("POST /api/saas/pwa/install requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/pwa/install", "POST", {});
  });

  test("GET /api/saas/pwa/manifest returns a manifest even unauthenticated", async ({ request }) => {
    const res = await request.get("/api/saas/pwa/manifest", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.scope).toBe("/saas");
    expect(body.start_url).toBe("/saas/dashboard");
  });
});
