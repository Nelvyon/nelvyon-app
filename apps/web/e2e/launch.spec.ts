/**
 * Smoke suite mínimo para launch: signup, auth-gate, health.
 * Corre sin credenciales de DB ni Stripe — solo verifica que las rutas cargan.
 */
import { expect, test } from "@playwright/test";

test("signup page carga formulario de registro", async ({ page }) => {
  await page.goto("/auth/register");
  await expect(page.getByRole("heading", { name: /crear cuenta/i })).toBeVisible();
});

test("/saas/dashboard requiere autenticación", async ({ page }) => {
  await page.goto("/saas/dashboard");
  // Debe redirigir a /auth/login (con o sin ?next param)
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("GET /api/health responde 200 con status ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { status: string };
  expect(body.status).toBe("ok");
});

test("rutas stub legacy devuelven 410 Gone", async ({ request }) => {
  const stubs = [
    "/api/saas/certificados",
    "/api/saas/knowledge-base",
    "/api/saas/encuestas",
    "/api/saas/comunidades",
    "/api/saas/documentos",
    "/api/saas/objects",
  ];
  for (const path of stubs) {
    const res = await request.get(path);
    expect(res.status(), `${path} should be 410`).toBe(410);
  }
});
