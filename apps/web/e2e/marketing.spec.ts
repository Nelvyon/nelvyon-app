import { expect, test } from "@playwright/test";

const go = (page: import("@playwright/test").Page, path: string) =>
  page.goto(path, { waitUntil: "domcontentloaded" });

test("Home redirige al pack AIOR index y carga NELVYON", async ({ page }) => {
  await go(page, "/");
  await expect(page).toHaveURL(/\/www\/index\.html/);
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

test("Producto showcase AIOR carga", async ({ page }) => {
  await go(page, "/producto");
  await expect(page).toHaveURL(/\/www\/home-saas-product-showcase\.html/);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
});

test("IA agentes AIOR carga", async ({ page }) => {
  await go(page, "/producto/ia");
  await expect(page).toHaveURL(/\/www\/home-ai-agent\.html/);
  await expect(page.locator("body")).toContainText(/NELVYON/i, { timeout: 20_000 });
});

test("Assets críticos del pack responden", async ({ page }) => {
  const css = await page.request.get("/www/assets/css/style.css");
  expect(css.status()).toBe(200);
  const home = await page.request.get("/www/index.html");
  expect(home.status()).toBe(200);
});
