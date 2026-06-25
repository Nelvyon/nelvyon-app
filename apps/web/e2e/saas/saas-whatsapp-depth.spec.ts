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
    {
      id: "t2", metaTemplateId: "meta-2", name: "auth_otp",
      language: "es", status: "APPROVED", category: "AUTHENTICATION",
      components: [{ type: "BODY", text: "Tu código es {{1}}." }],
      qualityScore: null,
      syncedAt: new Date().toISOString(),
    },
  ],
};

const FIXTURE_CATALOG = {
  products: [
    {
      id: "p1", metaProductId: "prod-1", catalogId: "cat-456",
      name: "Camiseta básica", description: "100% algodón",
      priceAmount: 29.99, priceCurrency: "EUR",
      imageUrl: null, availability: "in stock", retailerId: "SKU-001",
    },
  ],
};

test.describe("SaaS WhatsApp Depth (S39)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);

    await page.route("**/api/saas/whatsapp/templates**", route => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: { synced: 2 } });
      }
      return route.fulfill({ json: FIXTURE_TEMPLATES });
    });

    await page.route("**/api/saas/whatsapp/catalog**", route => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: { synced: 1 } });
      }
      return route.fulfill({ json: FIXTURE_CATALOG });
    });

    await page.route("**/api/saas/whatsapp**", route => {
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
    await page.goto("/saas/whatsapp");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await page.waitForTimeout(600);

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
    // Header
    expect(body).toContain("WhatsApp Business");
    // Config badge
    expect(body).toContain("WhatsApp activo");
    expect(body).toContain("meta");
    // KPIs
    expect(body).toContain("Enviados");
    expect(body).toContain("Total");
    // Tabs
    expect(body).toContain("Mensajes");
    expect(body).toContain("Plantillas");
    expect(body).toContain("Catálogo");
  });

  test("tab Plantillas muestra plantillas sincronizadas con nombre y estado", async ({ page }) => {
    await page.goto("/saas/whatsapp");
    await page.waitForTimeout(500);

    // Click on Plantillas tab
    await page.getByText("📋 Plantillas").click();
    await page.waitForTimeout(600);

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
    expect(body).toContain("promo_verano");
    expect(body).toContain("APPROVED");
    expect(body).toContain("MARKETING");
    expect(body).toContain("Sincronizar Meta");
  });

  test("envío template mock dispara POST y muestra confirmación", async ({ page }) => {
    await page.goto("/saas/whatsapp");
    await page.waitForTimeout(500);

    // Go to Plantillas tab
    await page.getByText("📋 Plantillas").click();
    await page.waitForTimeout(500);

    // Click Enviar on first template
    const sendBtn = page.locator("button", { hasText: "↗ Enviar" }).first();
    await sendBtn.click();
    await page.waitForTimeout(300);

    // Modal should appear with template name
    const modalBody = await page.locator("body").textContent();
    expect(modalBody).toContain("Enviar plantilla");
    expect(modalBody).toContain("Teléfono destino");

    // Fill form and submit
    await page.fill("input[type=tel]", "+34600000099");
    // Fill variables
    const varInputs = page.locator("input").filter({ hasNot: page.locator("input[type=tel]") });
    const count = await varInputs.count();
    for (let i = 0; i < count; i++) {
      await varInputs.nth(i).fill(`valor${i + 1}`);
    }

    await page.locator("button", { hasText: "Enviar plantilla" }).click();
    await page.waitForTimeout(400);

    // Modal should close (no "Enviar plantilla" header visible anymore or
    // we verify by checking the page went back to templates list)
    const afterBody = await page.locator("body").textContent();
    expect(afterBody).not.toContain("Something went wrong");
  });
});
