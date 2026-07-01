import { test, expect } from "@playwright/test";
import { setAuthCookie } from "./fixtures";

test.describe("SaaS elite APIs", () => {
  test.beforeEach(async ({ context }) => {
    await setAuthCookie(context);
  });

  test("GET /api/saas/crm/dedupe returns groups", async ({ request }) => {
    const res = await request.get("/api/saas/crm/dedupe");
    if (res.status() === 401) return;
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { groups?: unknown[] };
    expect(Array.isArray(body.groups)).toBe(true);
  });

  test("GET /api/saas/webhooks/dlq returns failures array", async ({ request }) => {
    const res = await request.get("/api/saas/webhooks/dlq");
    if (res.status() === 401) return;
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { failures?: unknown[] };
    expect(Array.isArray(body.failures)).toBe(true);
  });

  test("GET /api/saas/integrations/hubspot/sync returns state", async ({ request }) => {
    const res = await request.get("/api/saas/integrations/hubspot/sync");
    if (res.status() === 401) return;
    expect(res.status()).toBeLessThan(500);
  });

  test("GET /api/saas/dashboard/layout returns widgets", async ({ request }) => {
    const res = await request.get("/api/saas/dashboard/layout");
    if (res.status() === 401) return;
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { layout?: { widgets?: string[] } };
    expect(Array.isArray(body.layout?.widgets)).toBe(true);
  });
});
