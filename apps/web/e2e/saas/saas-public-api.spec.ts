/**
 * Public API v1 smoke tests — validates auth gates and basic response shape.
 * These tests use the Playwright `request` fixture (no browser needed).
 *
 * NOTE: tests that require a real DB/key use page.route() mocks — no live
 * API key is needed in CI.
 */
import { test, expect } from "@playwright/test";

const PUBLIC_ENDPOINTS = [
  "/api/public/v1/contacts",
  "/api/public/v1/deals",
  "/api/public/v1/campaigns",
];

test.describe("Public API v1 — 401 sin API key", () => {
  for (const endpoint of PUBLIC_ENDPOINTS) {
    test(`GET ${endpoint} → 401 sin Authorization header`, async ({ request }) => {
      const res = await request.get(endpoint);
      expect(res.status()).toBe(401);
      const json = await res.json() as Record<string, unknown>;
      expect(json.error).toBeTruthy();
    });
  }

  test("POST /api/public/v1/contacts → 401 sin key", async ({ request }) => {
    const res = await request.post("/api/public/v1/contacts", {
      data: { name: "Test Contact", email: "t@t.com" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/public/v1/workflows/trigger → 401 sin key", async ({ request }) => {
    const res = await request.post("/api/public/v1/workflows/trigger", {
      data: { workflowId: "wf-test", contactId: "c-test" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Public API v1 — 401 con key formato inválido", () => {
  test("GET /api/public/v1/contacts → 401 con Bearer formato incorrecto", async ({ request }) => {
    const res = await request.get("/api/public/v1/contacts", {
      headers: { Authorization: "Bearer not-a-valid-key-format" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/public/v1/contacts → 401 sin Bearer prefix", async ({ request }) => {
    const res = await request.get("/api/public/v1/contacts", {
      headers: { Authorization: "nelvyon_sk_test_fake_key_123456789" },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Public API v1 — respuesta estructura correcta en 401", () => {
  test("body de 401 contiene campo error string", async ({ request }) => {
    const res = await request.get("/api/public/v1/contacts");
    const json = await res.json() as Record<string, unknown>;
    expect(typeof json.error).toBe("string");
    expect(json.error).not.toBe("");
  });

  test("headers de 401 contienen Content-Type json", async ({ request }) => {
    const res = await request.get("/api/public/v1/contacts");
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("json");
  });
});
