/**
 * S52 — E2E: Pack Store
 */
import { expect, test } from "@playwright/test";
import { setupAuthedSaas, mockPackStore, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

test.describe("S52 — /saas/packs page", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
    await mockPackStore(page);
  });

  test("page loads without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("header Pack Store visible", async ({ page }) => {
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Pack Store" })).toBeVisible({ timeout: 10_000 });
  });

  test("summary KPIs render", async ({ page }) => {
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Packs en catálogo")).toBeVisible({ timeout: 10_000 });
  });

  test("nav sidebar shows Pack Store item", async ({ page }) => {
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Pack Store/i })).toBeVisible();
  });

  test("catalog cards render pack names", async ({ page }) => {
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Crecimiento Local")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Crecimiento Ecommerce")).toBeVisible();
  });

  test("owned pack shows Lanzar ahora CTA", async ({ page }) => {
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Lanzar ahora/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("coming_soon pack shows En desarrollo disabled", async ({ page }) => {
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: /En desarrollo/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await expect(btn).toBeDisabled();
  });

  test("Lanzar ahora navigates to brief-to-launch with packId", async ({ page }) => {
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Lanzar ahora/i }).first().click();
    await expect(page).toHaveURL(/\/saas\/brief-to-launch\?packId=local-business-growth/);
  });

  test("category filter narrows the grid", async ({ page }) => {
    await page.goto("/saas/packs", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Crecimiento Local")).toBeVisible({ timeout: 10_000 });
    await page.locator("select").first().selectOption("ads");
    await expect(page.getByText("Crecimiento Local")).toHaveCount(0);
  });
});

test.describe("S52 — Pack Store API auth", () => {
  test("GET /api/saas/packs requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/packs");
  });

  test("GET /api/saas/packs/[id] requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/packs/local-business-growth");
  });

  test("POST /api/saas/packs/[id]/purchase requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/packs/local-business-growth/purchase", "POST", {});
  });

  test("POST /api/saas/packs/sync-plan requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/packs/sync-plan", "POST", {});
  });
});
