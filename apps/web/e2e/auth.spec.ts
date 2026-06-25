import { expect, test } from "@playwright/test";

test(" /auth/login carga formulario", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "Entrar a NELVYON OS" })).toBeVisible();
});

test("/auth/register carga formulario", async ({ page }) => {
  await page.goto("/auth/register");
  await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();
});

test("Login inválido muestra error", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Invalid credentials" }) });
  });
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill("bad@test.com");
  await page.getByLabel("Contraseña").fill("wrong");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
});

test("Ruta protegida /saas/dashboard redirige a /login sin auth", async ({ page }) => {
  await page.goto("/saas/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fsaas%2Fdashboard/);
});

test("Ruta admin /admin redirige a /login sin auth", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});
