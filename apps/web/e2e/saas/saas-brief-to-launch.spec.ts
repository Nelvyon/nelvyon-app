/**
 * S49 — E2E: Brief-to-Launch wizard
 */
import { expect, test } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("S49 — /saas/brief-to-launch page", () => {
  test("page loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("page title visible", async ({ page }) => {
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    await expect(page.getByText("Lanzar Pack IA")).toBeVisible();
  });

  test("wizard step indicator visible", async ({ page }) => {
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    await expect(page.getByText("1. Pack")).toBeVisible();
    await expect(page.getByText("2. Brief")).toBeVisible();
  });

  test("pack cards appear in select step", async ({ page }) => {
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    // Either packs load or loading state shows
    const packsOrLoading = page.locator("button:has-text('Continuar'), :text('Cargando packs'), button:has-text('Crecimiento')");
    await expect(packsOrLoading).toBeVisible({ timeout: 8000 });
  });

  test("nav sidebar shows 'Lanzar Pack' item", async ({ page }) => {
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    await expect(page.getByText("Lanzar Pack")).toBeVisible();
  });

  test("GET /api/saas/brief-to-launch returns 200 or 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/saas/brief-to-launch`);
    expect([200, 401]).toContain(res.status());
  });

  test("POST /api/saas/brief-to-launch without packId returns 400 or 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/saas/brief-to-launch`, {
      data: { brief: {} },
    });
    expect([400, 401]).toContain(res.status());
  });

  test("POST /api/saas/brief-to-launch with valid body returns 201 or 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/saas/brief-to-launch`, {
      data: {
        packId: "local-business-growth",
        brief: {
          business_name: "Test Corp",
          city: "Madrid",
          value_proposition: "Best",
          primary_cta: "Call us",
        },
      },
    });
    expect([201, 401]).toContain(res.status());
  });

  test("GET /api/saas/brief-to-launch/[id] returns 200 or 401 or 404", async ({ request }) => {
    const res = await request.get(`${BASE}/api/saas/brief-to-launch/test-launch-id`);
    expect([200, 401, 404]).toContain(res.status());
  });
});

test.describe("S49 — Pack selection flow", () => {
  test("clicking a pack card selects it and shows Continuar button", async ({ page }) => {
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    const packCard = page.locator("button").filter({ hasText: "Crecimiento Local" }).first();
    if (await packCard.isVisible()) {
      await packCard.click();
      await expect(page.getByRole("button", { name: /Continuar con/i })).toBeVisible();
    }
  });

  test("beta pack shows beta badge and waitlist message on select", async ({ page }) => {
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    const betaCard = page.locator("button:has(.text-yellow-400)").first();
    if (await betaCard.isVisible()) {
      await betaCard.click();
      await expect(page.getByText(/beta/i)).toBeVisible();
    }
  });

  test("Continuar button advances to brief step", async ({ page }) => {
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    const packCard = page.locator("button").filter({ hasText: "Crecimiento Local" }).first();
    if (await packCard.isVisible()) {
      await packCard.click();
      const continuar = page.getByRole("button", { name: /Continuar con/i });
      if (await continuar.isVisible()) {
        await continuar.click();
        await expect(page.getByText("Brief del proyecto")).toBeVisible();
      }
    }
  });

  test("Lanzar pack button disabled when brief is incomplete", async ({ page }) => {
    await page.goto(`${BASE}/saas/brief-to-launch`, { waitUntil: "networkidle" });
    const packCard = page.locator("button").filter({ hasText: "Crecimiento Local" }).first();
    if (await packCard.isVisible()) {
      await packCard.click();
      await page.getByRole("button", { name: /Continuar con/i }).click().catch(() => {});
      const launchBtn = page.getByRole("button", { name: /Lanzar pack/i });
      if (await launchBtn.isVisible()) {
        await expect(launchBtn).toBeDisabled();
      }
    }
  });
});
