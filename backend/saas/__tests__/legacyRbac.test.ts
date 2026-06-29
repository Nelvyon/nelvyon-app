/**
 * Bloque 3 RBAC tests:
 * 1. Legacy pages routes return 410
 * 2. New App Router routes enforce requireSaasContext (401 without auth)
 * 3. Cross-tenant isolation: viewer cannot access profile.write
 */
import { describe, it, expect, vi } from "vitest";

// ─── Legacy 410 tests ─────────────────────────────────────────────────────────

import { deprecatedRoute } from "../../../apps/web/src/pages/api/saas/_deprecated";

const analyticsLegacy = deprecatedRoute("/api/saas/analytics");
const invoicesLegacy = deprecatedRoute("/api/saas/invoices");
const profileLegacy = deprecatedRoute("/api/saas/profile");

function makeApiReq(method = "GET"): Parameters<typeof analyticsLegacy>[0] {
  return { method } as never;
}
function makeApiRes() {
  let _status = 200;
  const headers: Record<string, string> = {};
  const res = {
    status(s: number) { _status = s; return res; },
    json(body: unknown) { return { status: _status, body }; },
    setHeader(k: string, v: string) { headers[k] = v; },
    getStatus() { return _status; },
  };
  return res;
}

describe("Legacy pages routes → 410", () => {
  it("GET /pages/api/saas/analytics retorna 410", async () => {
    const res = makeApiRes();
    const result = await (analyticsLegacy as (req: ReturnType<typeof makeApiReq>, res: ReturnType<typeof makeApiRes>) => Promise<ReturnType<typeof res.json>>)(makeApiReq(), res);
    expect((result as { status: number }).status).toBe(410);
    expect((result as { body: { error: string } }).body.error).toMatch(/Deprecated/);
  });

  it("GET /pages/api/saas/invoices retorna 410", async () => {
    const res = makeApiRes();
    const result = await (invoicesLegacy as (req: ReturnType<typeof makeApiReq>, res: ReturnType<typeof makeApiRes>) => Promise<ReturnType<typeof res.json>>)(makeApiReq(), res);
    expect((result as { status: number }).status).toBe(410);
  });

  it("GET /pages/api/saas/profile retorna 410", async () => {
    const res = makeApiRes();
    const result = await (profileLegacy as (req: ReturnType<typeof makeApiReq>, res: ReturnType<typeof makeApiRes>) => Promise<ReturnType<typeof res.json>>)(makeApiReq(), res);
    expect((result as { status: number }).status).toBe(410);
  });
});

// ─── RBAC — saasRbac unit tests ───────────────────────────────────────────────

import { assertSaasPermission, canSaasPerform, SaasRbacError } from "../saasRbac";

describe("saasRbac — nuevas acciones", () => {
  it("owner puede analytics.read", () => {
    expect(canSaasPerform("owner", "analytics.read")).toBe(true);
  });

  it("viewer puede notifications.read", () => {
    expect(canSaasPerform("viewer", "notifications.read")).toBe(true);
  });

  it("viewer NO puede profile.write", () => {
    expect(canSaasPerform("viewer", "profile.write")).toBe(false);
  });

  it("member puede invoices.read", () => {
    expect(canSaasPerform("member", "invoices.read")).toBe(true);
  });

  it("assertSaasPermission lanza SaasRbacError si viewer intenta profile.write", () => {
    expect(() => assertSaasPermission("viewer", "profile.write")).toThrow(SaasRbacError);
  });

  it("assertSaasPermission no lanza si owner intenta profile.write", () => {
    expect(() => assertSaasPermission("owner", "profile.write")).not.toThrow();
  });
});

// ─── App Router routes requieren auth (401 sin token) ────────────────────────

vi.mock("@nelvyon/saas", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@nelvyon/saas")>();
  return {
    ...mod,
    requireSaasContext: vi.fn().mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { name: "SaasRbacError", code: "FORBIDDEN" }),
    ),
    saasErrorStatus: () => 401,
    saasErrorBody: (e: unknown) => ({ error: (e as Error).message }),
  };
});

import { GET as analyticsGet } from "../../../apps/web/src/app/api/saas/analytics/route";
import { GET as profileGet } from "../../../apps/web/src/app/api/saas/profile/route";
import { GET as notificationsGet } from "../../../apps/web/src/app/api/saas/notifications/route";
import { GET as invoicesGet } from "../../../apps/web/src/app/api/saas/invoices/route";

function anonReq(path: string) {
  return new Request(`https://nelvyon.com${path}`);
}

describe("App Router routes — 401 sin autenticación", () => {
  it("GET /api/saas/analytics → 401", async () => {
    const res = await analyticsGet(anonReq("/api/saas/analytics"));
    expect(res.status).toBe(401);
  });

  it("GET /api/saas/profile → 401", async () => {
    const res = await profileGet(anonReq("/api/saas/profile"));
    expect(res.status).toBe(401);
  });

  it("GET /api/saas/notifications → 401", async () => {
    const res = await notificationsGet(anonReq("/api/saas/notifications"));
    expect(res.status).toBe(401);
  });

  it("GET /api/saas/invoices → 401", async () => {
    const res = await invoicesGet(anonReq("/api/saas/invoices"));
    expect(res.status).toBe(401);
  });
});
