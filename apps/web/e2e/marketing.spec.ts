import { expect, test } from "@playwright/test";

test("Home carga y muestra headline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "El primer OS de marketing digital con IA" })).toBeVisible();
});

test("Pricing carga y muestra los 3 planes", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "STARTER" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PRO" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ENTERPRISE" })).toBeVisible();
});

test("Toggle anual/mensual cambia los precios", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("€47/mes")).toBeVisible();
  await page.getByRole("button", { name: /Anual/i }).click();
  await expect(page.getByText("€39/mes")).toBeVisible();
});

test("Partners carga y calculadora funciona", async ({ page }) => {
  await page.goto("/partners");
  await expect(page.getByText("Calculadora simple")).toBeVisible();
  await page.getByLabel("Número de clientes").fill("10");
  await expect(page.getByText("€291.00")).toBeVisible();
});

test("CTA Empezar gratis navega a /auth/register", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Empezar gratis" }).click();
  await expect(page).toHaveURL(/\/auth\/register$/);
});

test("Nav links funcionan correctamente", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation");
  await nav.getByRole("link", { name: "Precios" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await nav.getByRole("link", { name: "Partners" }).click();
  await expect(page).toHaveURL(/\/partners$/);
});
