/**
 * Smoke suite mínimo para launch: signup, auth-gate, health.
 * Corre sin credenciales de DB ni Stripe — solo verifica que las rutas cargan.
 */
import { expect, test } from "@playwright/test";

test("signup page carga formulario de registro", async ({ page }) => {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /crear cuenta/i })).toBeVisible();
});

test("/saas/dashboard requiere autenticación", async ({ page }) => {
  await page.goto("/saas/dashboard");
  await expect(page).toHaveURL(/\/login/);
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
    "/api/saas/comunidades",
    "/api/saas/productos",
  ];
  for (const path of stubs) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), `${path} should be 410`).toBe(410);
  }
});

test("alias legacy activos requieren auth (401 sin cookie)", async ({ request }) => {
  const aliases = [
    "/api/saas/encuestas",
    "/api/saas/documentos",
    "/api/saas/objects",
    "/api/saas/qr",
  ];
  for (const path of aliases) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), `${path} should be 401`).toBe(401);
  }
});
