import { test, expect } from "@playwright/test";

const CRITICAL_SAAS_ROUTES = [
  "/saas/dashboard",
  "/saas/crm",
  "/saas/campanias",
  "/saas/workflows",
  "/saas/billing",
  "/saas/integraciones",
];

for (const route of CRITICAL_SAAS_ROUTES) {
  test(`a11y landmarks: ${route} has main navigation`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
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
