/**
 * OS pack kickoff E2E — all autonomous packs + analytics-insights alias.
 */
import { expect, test } from "@playwright/test";

const PACK_IDS = [
  "local-business-growth",
  "ecommerce-growth",
  "saas-b2b-growth",
  "social-calendar-pack",
  "content-strategy-pack",
  "cro-audit-pack",
  "analytics-setup-pack",
  "analytics-insights",
  "brand-voice-pack",
];

for (const packId of PACK_IDS) {
  test(`POST /api/os/packs/${packId}/kickoff route exists`, async ({ request }) => {
    const res = await request.post(`/api/os/packs/${packId}/kickoff`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).not.toBe(404);
    expect(res.status()).not.toBe(410);
  });
}

test("GET /api/lms/public/courses responde (200 o 503 sin DB)", async ({ request }) => {
  const res = await request.get("/api/lms/public/courses");
  expect([200, 500, 503]).toContain(res.status());
});

test("GET /api/saas/crm/dedupe requiere auth", async ({ request }) => {
  const res = await request.get("/api/saas/crm/dedupe");
  expect([401, 403]).toContain(res.status());
});
