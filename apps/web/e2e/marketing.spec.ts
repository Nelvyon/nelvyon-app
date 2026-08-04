import { expect, test } from "@playwright/test";

const go = (page: import("@playwright/test").Page, path: string) =>
  page.goto(path, { waitUntil: "domcontentloaded" });

// Arquitectura publica vigente: `index.html` es Home 08 y `saas.html` es
// SaaS 02. Son las dos unicas paginas AIOR; el resto se consolido en ellas.

test("Home sirve el pack AIOR Home 08 en / y carga NELVYON", async ({ page }) => {
  await go(page, "/");
  // `/` es un rewrite a /www/index.html (next.config.ts): la URL no cambia.
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle(/NELVYON/i);
  await expect(page.locator("body")).toContainText(/NELVYON/i, { timeout: 20_000 });
  await expect(page.locator("h1").first()).toBeVisible();
});

test("Precios carga planes SaaS en pricing.html", async ({ page }) => {
  await go(page, "/precios");
  await expect(page).toHaveURL(/\/www\/pricing\.html/);
  await expect(page.locator("body")).toContainText(/Starter|Growth|Elite/i, { timeout: 20_000 });
});

test("Contacto carga formulario NELVYON", async ({ page }) => {
  await go(page, "/contacto");
  await expect(page).toHaveURL(/\/www\/contact\.html/);
  await expect(page.locator("form").first()).toBeVisible({ timeout: 20_000 });
});

test("Partners carga y calculadora funciona", async ({ page }) => {
  await go(page, "/partners");
  await expect(page.getByText(/Calculadora ilustrativa/i)).toBeVisible({ timeout: 20_000 });
  await page.getByLabel(/Número de clientes referidos/i).fill("10");
  await expect(page.getByText("€291.00")).toBeVisible();
});

test("Producto carga el pack AIOR SaaS 02", async ({ page }) => {
  const res = await go(page, "/producto");
  expect(res?.status(), "/producto no debe acabar en una pagina 404").toBe(200);
  await expect(page).toHaveURL(/\/www\/saas\.html/);
  await expect(page).toHaveTitle(/NELVYON/i);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
});

// Slugs de /producto/* sin ficha propia. Apuntaban a Homes AIOR eliminadas
// (`home-ai-agent.html`, `home-ai-chatbot.html`, `home-productivity-tools.html`,
// `home-ai-chatbot-tool.html`), todas 404. Se comprueba el destino FINAL y que
// responda 200: la comprobacion anterior ("el cuerpo contiene NELVYON") pasaba
// en falso porque la propia pagina de error tambien lo contiene.
const PRODUCTO_SLUGS: Array<{ slug: string; destinoFinal: RegExp }> = [
  { slug: "ia", destinoFinal: /\/www\/saas\.html$/ },
  { slug: "agentes", destinoFinal: /\/www\/saas\.html$/ },
  { slug: "inbox", destinoFinal: /\/login\?next=%2Fsaas%2Finbox/ },
  { slug: "workflows", destinoFinal: /\/login\?next=%2Fsaas%2Fworkflows/ },
  { slug: "whatsapp", destinoFinal: /\/login\?next=%2Fsaas%2Fwhatsapp/ },
  // Ruta estatica propia, apuntaba a `home-cloud-based-saas.html` (404).
  { slug: "cloud", destinoFinal: /\/www\/saas\.html$/ },
];

for (const { slug, destinoFinal } of PRODUCTO_SLUGS) {
  test(`/producto/${slug} resuelve a una ruta viva de NELVYON`, async ({ page }) => {
    const res = await go(page, `/producto/${slug}`);
    expect(res?.status(), `/producto/${slug} debe responder 200, no 404`).toBe(200);
    await expect(page).toHaveURL(destinoFinal);
    // Ninguna Home AIOR antigua debe seguir siendo destino.
    await expect(page).not.toHaveURL(/\/www\/home-/);
  });
}

test("Assets críticos del pack responden", async ({ page }) => {
  const css = await page.request.get("/www/assets/css/style.css");
  expect(css.status()).toBe(200);
  // Las dos paginas AIOR vigentes: Home 08 y SaaS 02.
  const home = await page.request.get("/www/index.html");
  expect(home.status()).toBe(200);
  const saas = await page.request.get("/www/saas.html");
  expect(saas.status()).toBe(200);
});
