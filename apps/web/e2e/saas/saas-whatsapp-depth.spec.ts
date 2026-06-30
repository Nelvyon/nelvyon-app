import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis } from "./fixtures";

const FIXTURE_MESSAGES = {
  whatsapp_configured: true,
  provider: "meta",
  phone_number_id: "123456789",
  from_number: null,
  messages: [
    { id: "m1", to: "+34600000001", body: "Hola, tienes una oferta!", status: "sent", createdAt: new Date().toISOString() },
  ],
};

const FIXTURE_TEMPLATES = {
  templates: [
    {
      id: "t1", metaTemplateId: "meta-1", name: "promo_verano",
      language: "es", status: "APPROVED", category: "MARKETING",
      components: [
        { type: "HEADER", format: "TEXT", text: "¡Oferta especial!" },
        { type: "BODY", text: "Hola {{1}}, tienes un descuento del {{2}}%." },
      ],
      qualityScore: "GREEN",
      syncedAt: new Date().toISOString(),
    },
  ],
};

test.describe("SaaS WhatsApp Depth (S39)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);

    await page.route("**/api/saas/whatsapp/templates**", route => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: { synced: 1 } });
      }
      return route.fulfill({ json: FIXTURE_TEMPLATES });
    });

    await page.route(/\/api\/saas\/whatsapp(\?|$)/, route => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          json: {
            message: { id: "m2", to: "+34600000002", body: "[template:promo_verano]", metaWamid: "wamid.new", status: "sent", contactId: null, createdAt: new Date().toISOString() },
            provider: "meta",
          },
        });
      }
      return route.fulfill({ json: FIXTURE_MESSAGES });
    });
  });

  test("WhatsApp carga sin error con banner Meta configurado y KPIs", async ({ page }) => {
    await page.goto("/saas/whatsapp", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "WhatsApp Business" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/WhatsApp activo/i)).toBeVisible();
    await expect(page.getByText("Enviados")).toBeVisible();
    await expect(page.getByRole("button", { name: /Plantillas/i })).toBeVisible();
  });

  test("tab Plantillas muestra plantillas sincronizadas con nombre y estado", async ({ page }) => {
    await page.goto("/saas/whatsapp", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/whatsapp**", { timeout: 15_000 });
    await page.getByRole("button", { name: /Plantillas/i }).click();
    await page.waitForResponse("**/api/saas/whatsapp/templates**", { timeout: 15_000 });
    await expect(page.getByText("promo_verano")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("APPROVED")).toBeVisible();
    await expect(page.getByText(/Sincronizar Meta/i)).toBeVisible();
  });

  test("envío template mock dispara POST y muestra confirmación", async ({ page }) => {
    await page.goto("/saas/whatsapp", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/whatsapp**", { timeout: 15_000 });
    await page.getByRole("button", { name: /Plantillas/i }).click();
    await page.waitForResponse("**/api/saas/whatsapp/templates**", { timeout: 15_000 });
    await expect(page.getByText("promo_verano")).toBeVisible({ timeout: 15_000 });

    await page.locator("button", { hasText: "↗ Enviar" }).first().click();
    await expect(page.getByRole("heading", { name: "Enviar plantilla" })).toBeVisible();

    await page.fill("input[type=tel]", "+34600000099");
    const varInputs = page.locator("input:not([type=tel])");
    const count = await varInputs.count();
    for (let i = 0; i < count; i++) {
      await varInputs.nth(i).fill(`valor${i + 1}`);
    }

    await page.getByRole("button", { name: "Enviar plantilla" }).click();
    await expect(page.getByRole("heading", { name: "Enviar plantilla" })).not.toBeVisible({ timeout: 8000 });
  });
});
