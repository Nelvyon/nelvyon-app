/**
 * staging-smoke-local-pack-e2e
 * Verifica que los 3 Growth Packs responden correctamente al kickoff.
 * Solo corre contra staging/prod (BASE_URL real). En CI local usa mocks.
 */
import { expect, test } from "@playwright/test";

const PACK_IDS = [
  "local-business-growth",
  "ecommerce-growth",
  "saas-b2b-growth",
];

// Health check ensures the app is reachable before testing packs
test("GET /api/health responde 200", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { status: string };
  expect(body.status).toBe("ok");
});

// Kickoff routes must exist and respond (not 404/410)
for (const packId of PACK_IDS) {
  test(`POST /api/os/packs/${packId}/kickoff existe (no 404)`, async ({ request }) => {
    // POST without auth → 401 or 400, NOT 404 or 410
    const res = await request.post(`/api/os/packs/${packId}/kickoff`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    // We expect auth failure (401/400/403), not route missing (404) or gone (410)
    expect(res.status()).not.toBe(404);
    expect(res.status()).not.toBe(410);
  });
}

// Service catalog: coming_soon packs must have valid slugs
test("Catálogo de service packs — 5 nuevos packs tienen slugs válidos", async ({ request }) => {
  const res = await request.get("/api/os/packs/catalog", { maxRedirects: 0 });
  // Sin skip. El smoke corre a proposito SIN credenciales de plataforma, asi
  // que 401/403 es el resultado correcto y afirmarlo vale mas que saltarse el
  // test: comprueba que la ruta existe Y que esta protegida.
  //
  // 404 y 410 siguen siendo defecto. Antes se saltaban junto a los codigos de
  // auth y resulto que la ruta no existia: el test llevaba anos sin comprobar
  // nada. Los slugs, que es la propiedad de negocio, los cubre
  // `servicePacksCatalogSlugs.test.ts`, que si puede ejecutarse siempre.
  expect(res.status()).not.toBe(404);
  expect(res.status()).not.toBe(410);
  expect([200, 401, 403]).toContain(res.status());
  if (res.status() !== 200) return;
  const body = (await res.json()) as { packs?: Array<{ id: string; availability: string }> };
  const packs = body.packs ?? [];
  const newPacks = ["social-calendar-pack", "content-strategy-pack", "cro-audit-pack", "analytics-setup-pack", "brand-voice-pack"];
  for (const id of newPacks) {
    const found = packs.find((p) => p.id === id);
    if (found) {
      expect(["available", "beta", "coming_soon"]).toContain(found.availability);
    }
  }
});
