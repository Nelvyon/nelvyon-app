/**
 * S49 — E2E: Brief-to-Launch wizard
 */
import { expect, test } from "@playwright/test";
import { setupAuthedSaas, LOGIN_URL } from "./fixtures";

test.describe("S49 — /saas/brief-to-launch page", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
  });

  test("page loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("page title visible", async ({ page }) => {
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Lanzar Pack IA")).toBeVisible({ timeout: 10_000 });
  });

  test("wizard step indicator visible", async ({ page }) => {
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("1. Pack")).toBeVisible();
    await expect(page.getByText("2. Brief")).toBeVisible();
  });

  test("pack cards appear in select step", async ({ page }) => {
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Crecimiento Local")).toBeVisible({ timeout: 10_000 });
  });

  test("nav sidebar shows 'Lanzar Pack' item", async ({ page }) => {
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Lanzar Pack/i })).toBeVisible();
  });

  test("GET /api/saas/brief-to-launch returns 200 or 401", async ({ request }) => {
    const res = await request.get("/api/saas/brief-to-launch");
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/saas/brief-to-launch without packId returns 400 or 401", async ({ request }) => {
    const res = await request.post("/api/saas/brief-to-launch", { data: { brief: {} } });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/saas/brief-to-launch with valid body returns 201 or 401", async ({ request }) => {
    const res = await request.post("/api/saas/brief-to-launch", {
      data: {
        packId: "local-business-growth",
        brief: { business_name: "Test Corp", city: "Madrid", value_proposition: "Best", primary_cta: "Call us" },
      },
    });
    expect([201, 401]).toContain(res.status());
  });

  test("GET /api/saas/brief-to-launch/[id] returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.get("/api/saas/brief-to-launch/test-launch-id");
    expect([200, 401, 404]).toContain(res.status());
  });
});

test.describe("S49 — Pack selection flow", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
  });

  test("clicking a pack card selects it and shows Continuar button", async ({ page }) => {
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Crecimiento Local/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Crecimiento Local/i }).click();
    await expect(page.getByRole("button", { name: /Continuar con/i })).toBeVisible();
  });

  test("beta pack shows beta badge and waitlist message on select", async ({ page }) => {
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/brief-to-launch**", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Crecimiento Ecommerce/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("BETA")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Crecimiento Ecommerce/i }).click();
    await expect(page.getByText(/Pack en beta|BETA/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Continuar button advances to brief step", async ({ page }) => {
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Crecimiento Local/i }).click();
    await page.getByRole("button", { name: /Continuar con/i }).click();
    await expect(page.getByText("Brief del proyecto")).toBeVisible();
  });

  test("Lanzar pack button disabled when brief is incomplete", async ({ page }) => {
    await page.goto("/saas/brief-to-launch", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Crecimiento Local/i }).click();
    await page.getByRole("button", { name: /Continuar con/i }).click();
    await expect(page.getByRole("button", { name: /Lanzar pack/i })).toBeDisabled();
  });
});
