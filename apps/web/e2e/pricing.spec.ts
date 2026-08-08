import { expect, test } from "@playwright/test";

/**
 * La pagina publica de precios es `pricing.html` del pack AIOR: `/pricing` y
 * `/precios` acaban ahi. Muestra los tres planes canonicos de NELVYON y sus
 * CTAs llevan a contacto (venta asistida), no a un checkout autoservicio.
 *
 * Los tests anteriores esperaban botones React "Empezar con Pro/Starter" que
 * navegaban a `/login?next=...plan=...`. Ese componente
 * (`PricingPageContent`) ya no lo monta ninguna ruta, asi que comprobaban una
 * interfaz inexistente.
 */

test("/pricing y /precios sirven la pagina de precios del pack", async ({ page }) => {
  for (const ruta of ["/pricing", "/precios"]) {
    const res = await page.goto(ruta, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `${ruta} debe responder 200, no 404`).toBe(200);
    await expect(page).toHaveURL(/\/www\/pricing\.html/);
  }
});

test("La pagina de precios muestra los tres planes canonicos", async ({ page }) => {
  await page.goto("/precios", { waitUntil: "domcontentloaded" });
  const body = page.locator("body");
  for (const plan of ["Starter", "Growth", "Elite"]) {
    await expect(body).toContainText(plan, { timeout: 20_000 });
  }
});

test("Los CTAs de precios llevan a una pagina viva", async ({ page }) => {
  await page.goto("/precios", { waitUntil: "domcontentloaded" });
  // La pagina reparte los planes en varias pestanas (mensual/anual), asi que
  // solo un subconjunto de los CTAs esta visible en cada momento: se exige un
  // CTA visible, no el primero del DOM.
  const ctas = page.locator('a.th-btn[href="contact.html"]');
  await expect(ctas.first()).toBeAttached({ timeout: 20_000 });
  await expect(page.locator('a.th-btn[href="contact.html"]:visible').first()).toBeVisible({
    timeout: 20_000,
  });

  const res = await page.goto("/www/contact.html", { waitUntil: "domcontentloaded" });
  expect(res?.status(), "el destino de los CTAs no puede ser un 404").toBe(200);
  await expect(page.locator("form").first()).toBeVisible({ timeout: 20_000 });
});
