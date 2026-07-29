import { expect, test } from "@playwright/test";

test("Home carga y muestra headline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /El sistema operativo de marketing que ejecuta por ti/i })).toBeVisible();
});

test("Pricing carga y muestra los 3 planes", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agency" })).toBeVisible();
});

test("Pricing muestra precios y CTAs actuales", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("97€").first()).toBeVisible();
  await expect(page.getByText("297€").first()).toBeVisible();
  await expect(page.getByText("797€").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Empezar con Starter/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Empezar con Pro/i })).toBeVisible();
});

test("Partners carga y calculadora funciona", async ({ page }) => {
  await page.goto("/partners");
  await expect(page.getByText("Calculadora simple")).toBeVisible();
  await page.getByLabel("Número de clientes").fill("10");
  await expect(page.getByText("€291.00")).toBeVisible();
});

test("CTA Empezar gratis navega a /auth/register", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("link", { name: "Empieza gratis" }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test("Nav links funcionan correctamente", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation");
  await nav.getByRole("link", { name: "Precios" }).click();
  await expect(page).toHaveURL(/\/precios$/);
  await page.goto("/");
  await nav.getByRole("link", { name: "Contacto" }).click();
  await expect(page).toHaveURL(/\/contacto$/);
});
