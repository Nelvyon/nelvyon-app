import { expect, test } from "@playwright/test";

const go = (page: import("@playwright/test").Page, path: string) =>
  page.goto(path, { waitUntil: "domcontentloaded" });

test("Home carga y muestra headline NELVYON", async ({ page }) => {
  await go(page, "/");
  await expect(
    page.getByRole("heading", { name: /Marketing digital ejecutado por IA/i }),
  ).toBeVisible({ timeout: 20_000 });
});

test("Precios carga y muestra los 3 planes SaaS", async ({ page }) => {
  await go(page, "/precios");
  await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Growth" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Elite" })).toBeVisible();
});

test("Precios muestra CTAs actuales", async ({ page }) => {
  await go(page, "/precios");
  await expect(page.getByRole("link", { name: /Empezar con Starter/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: /Elegir Growth/i })).toBeVisible();
});

test("Partners carga y calculadora funciona", async ({ page }) => {
  await go(page, "/partners");
  await expect(page.getByText(/Calculadora ilustrativa/i)).toBeVisible({ timeout: 20_000 });
  await page.getByLabel(/Número de clientes referidos/i).fill("10");
  await expect(page.getByText("€291.00")).toBeVisible();
});

test("CTA Solicitar demo navega a contacto", async ({ page }) => {
  await go(page, "/");
  await page.locator("header").getByRole("link", { name: "Solicitar demo" }).click();
  await expect(page).toHaveURL(/\/contacto/);
});

test("Nav links funcionan correctamente", async ({ page }) => {
  await go(page, "/");
  const nav = page.getByRole("navigation", { name: "Principal" });
  await nav.getByRole("link", { name: "Precios" }).click();
  await expect(page).toHaveURL(/\/precios$/);
  await go(page, "/");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Contacto" }).click();
  await expect(page).toHaveURL(/\/contacto$/);
});

test("SaaS hub y módulo CRM cargan", async ({ page }) => {
  await go(page, "/producto");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  await go(page, "/producto/crm");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
});
