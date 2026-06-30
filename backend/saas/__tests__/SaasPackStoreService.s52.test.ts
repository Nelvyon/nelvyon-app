/**
 * S52 — SaasPackStoreService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasPackStoreService,
  SaasPackStoreError,
  type PackCatalogEntry,
  type PackCatalogPort,
} from "../SaasPackStoreService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const CATALOG: PackCatalogEntry[] = [
  { id: "local-business-growth", slug: "local-growth", name: "Crecimiento Local", tagline: "...", category: "growth", availability: "available", outputs: ["Landing"], estimatedMinutes: 8, launchPackId: "local-business-growth" },
  { id: "ecommerce-growth", slug: "ecommerce-growth", name: "Crecimiento Ecommerce", tagline: "...", category: "growth", availability: "available", outputs: ["Tienda"], estimatedMinutes: 10, launchPackId: "ecommerce-growth" },
  { id: "seo-local-pack", slug: "seo-local", name: "SEO Local", tagline: "...", category: "seo", availability: "available", outputs: ["SEO"], estimatedMinutes: 6, launchPackId: "local-business-growth" },
  { id: "future-pack", slug: "future", name: "Pack Futuro", tagline: "...", category: "ads", availability: "coming_soon", outputs: [], estimatedMinutes: 5 },
];

const catalogPort: PackCatalogPort = { getCatalog: async () => CATALOG };

function entitlementRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ent-1", tenant_id: "t1", pack_id: "local-business-growth",
    source: "plan", status: "active", launches_remaining: 1, launches_used: 0,
    stripe_payment_intent_id: null, metadata: {},
    granted_at: new Date().toISOString(), expires_at: null, updated_at: new Date().toISOString(),
    ...over,
  };
}

// ── listEntitlements ────────────────────────────────────────────────────────────

describe("SaasPackStoreService — listEntitlements", () => {
  it("maps active entitlements", async () => {
    const db = makeDb(() => [entitlementRow()]);
    const svc = new SaasPackStoreService(db, catalogPort);
    const ents = await svc.listEntitlements("t1");
    expect(ents).toHaveLength(1);
    expect(ents[0]!.packId).toBe("local-business-growth");
    expect(ents[0]!.launchesRemaining).toBe(1);
  });

  it("returns [] when none", async () => {
    const svc = new SaasPackStoreService(makeDb(() => []), catalogPort);
    expect(await svc.listEntitlements("t1")).toHaveLength(0);
  });
});

// ── grantFromPlan ───────────────────────────────────────────────────────────────

describe("SaasPackStoreService — grantFromPlan", () => {
  it("grants 1 local pack for starter plan", async () => {
    const inserts: unknown[][] = [];
    const db = makeDb((sql, params) => {
      if (sql.includes("FROM saas_tenants")) return [{ plan: "starter" }];
      if (sql.includes("INSERT INTO saas_pack_entitlements")) {
        inserts.push(params);
        return [entitlementRow({ pack_id: params[1] as string, launches_remaining: params[2] })];
      }
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    const granted = await svc.grantFromPlan("t1");
    expect(granted).toHaveLength(1);
    expect(granted[0]!.packId).toBe("local-business-growth");
    expect(inserts).toHaveLength(1);
  });

  it("grants 8 packs for pro plan", async () => {
    const db = makeDb((sql, params) => {
      if (sql.includes("FROM saas_tenants")) return [{ plan: "pro" }];
      if (sql.includes("INSERT INTO saas_pack_entitlements"))
        return [entitlementRow({ pack_id: params[1] as string, launches_remaining: params[2] })];
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    const granted = await svc.grantFromPlan("t1");
    expect(granted).toHaveLength(8);
  });

  it("grants unlimited (null quota) for agency plan", async () => {
    const db = makeDb((sql, params) => {
      if (sql.includes("FROM saas_tenants")) return [{ plan: "agency" }];
      if (sql.includes("INSERT INTO saas_pack_entitlements"))
        return [entitlementRow({ pack_id: params[1] as string, launches_remaining: params[2] })];
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    const granted = await svc.grantFromPlan("t1");
    expect(granted).toHaveLength(8);
    expect(granted.every((g) => g.launchesRemaining === null)).toBe(true);
  });

  it("defaults to starter when plan unknown", async () => {
    const db = makeDb((sql, params) => {
      if (sql.includes("FROM saas_tenants")) return [{ plan: "mystery" }];
      if (sql.includes("INSERT INTO saas_pack_entitlements"))
        return [entitlementRow({ pack_id: params[1] as string })];
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    expect(await svc.grantFromPlan("t1")).toHaveLength(1);
  });
});

// ── canLaunch ───────────────────────────────────────────────────────────────────

describe("SaasPackStoreService — canLaunch", () => {
  it("allows when active entitlement with remaining > 0", async () => {
    const db = makeDb(() => [entitlementRow({ launches_remaining: 2 })]);
    const svc = new SaasPackStoreService(db, catalogPort);
    expect(await svc.canLaunch("t1", "local-business-growth")).toEqual({ allowed: true });
  });

  it("allows unlimited (null remaining)", async () => {
    const db = makeDb(() => [entitlementRow({ launches_remaining: null })]);
    const svc = new SaasPackStoreService(db, catalogPort);
    expect((await svc.canLaunch("t1", "local-business-growth")).allowed).toBe(true);
  });

  it("blocks when no entitlement (PACK_LOCKED)", async () => {
    const svc = new SaasPackStoreService(makeDb(() => []), catalogPort);
    const r = await svc.canLaunch("t1", "local-business-growth");
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("PACK_LOCKED");
  });

  it("blocks when quota exhausted", async () => {
    const db = makeDb(() => [entitlementRow({ launches_remaining: 0 })]);
    const svc = new SaasPackStoreService(db, catalogPort);
    const r = await svc.canLaunch("t1", "local-business-growth");
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("QUOTA_EXHAUSTED");
  });

  it("allows satellite SKU when parent growth pack is entitled", async () => {
    const db = makeDb((sql, params) => {
      if (sql.includes("SELECT * FROM saas_pack_entitlements") && params[1] === "seo-local-pack") {
        return [];
      }
      if (sql.includes("SELECT * FROM saas_pack_entitlements") && params[1] === "local-business-growth") {
        return [entitlementRow({ launches_remaining: 2 })];
      }
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    expect(await svc.canLaunch("t1", "seo-local-pack")).toEqual({ allowed: true });
  });
});

// ── consumeLaunch ───────────────────────────────────────────────────────────────

describe("SaasPackStoreService — consumeLaunch", () => {
  it("issues an UPDATE incrementing usage", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("SELECT * FROM saas_pack_entitlements")) {
        return [entitlementRow()];
      }
      return [];
    }) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasPackStoreService(db, catalogPort);
    await svc.consumeLaunch("t1", "local-business-growth");
    const updateCall = (db.query as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("launches_used = launches_used + 1"),
    );
    expect(updateCall).toBeTruthy();
  });
});

// ── recordPurchase ──────────────────────────────────────────────────────────────

describe("SaasPackStoreService — recordPurchase", () => {
  it("upserts a purchase entitlement (unlimited)", async () => {
    const db = makeDb((sql, params) =>
      sql.includes("INSERT INTO saas_pack_entitlements")
        ? [entitlementRow({ pack_id: params[1] as string, source: "purchase", launches_remaining: null })]
        : [],
    );
    const svc = new SaasPackStoreService(db, catalogPort);
    const ent = await svc.recordPurchase("t1", "ecommerce-growth", { stripePaymentIntentId: "pi_123" });
    expect(ent.source).toBe("purchase");
    expect(ent.launchesRemaining).toBeNull();
  });

  it("records promo source when promoCode provided", async () => {
    const db = makeDb((sql, params) =>
      sql.includes("INSERT INTO saas_pack_entitlements")
        ? [entitlementRow({ pack_id: params[1] as string, source: params[2] as string })]
        : [],
    );
    const svc = new SaasPackStoreService(db, catalogPort);
    const ent = await svc.recordPurchase("t1", "ecommerce-growth", { promoCode: "LAUNCH50" });
    expect(ent.source).toBe("promo");
  });

  it("throws VALIDATION for empty packId", async () => {
    const svc = new SaasPackStoreService(makeDb(() => []), catalogPort);
    await expect(svc.recordPurchase("t1", "")).rejects.toThrow(SaasPackStoreError);
  });
});

// ── revokeEntitlement ───────────────────────────────────────────────────────────

describe("SaasPackStoreService — revokeEntitlement", () => {
  it("revokes an active entitlement", async () => {
    const db = makeDb(() => [entitlementRow({ status: "revoked" })]);
    const svc = new SaasPackStoreService(db, catalogPort);
    const ent = await svc.revokeEntitlement("t1", "local-business-growth", "abuse");
    expect(ent.status).toBe("revoked");
  });

  it("throws NOT_FOUND when nothing active", async () => {
    const svc = new SaasPackStoreService(makeDb(() => []), catalogPort);
    await expect(svc.revokeEntitlement("t1", "x")).rejects.toThrow(SaasPackStoreError);
  });
});

// ── getStoreCatalog ─────────────────────────────────────────────────────────────

describe("SaasPackStoreService — getStoreCatalog", () => {
  it("marks coming_soon packs with access=coming_soon and canLaunch=false", async () => {
    const db = makeDb((sql) => (sql.includes("FROM saas_tenants") ? [{ plan: "starter" }] : []));
    const svc = new SaasPackStoreService(db, catalogPort);
    const items = await svc.getStoreCatalog("t1");
    const future = items.find((i) => i.id === "future-pack")!;
    expect(future.access).toBe("coming_soon");
    expect(future.canLaunch).toBe(false);
  });

  it("marks plan-included pack as included even without an entitlement row", async () => {
    const db = makeDb((sql) => (sql.includes("FROM saas_tenants") ? [{ plan: "starter" }] : []));
    const svc = new SaasPackStoreService(db, catalogPort);
    const items = await svc.getStoreCatalog("t1");
    const local = items.find((i) => i.id === "local-business-growth")!;
    expect(local.access).toBe("included");
  });

  it("merges entitlement → owned + canLaunch when purchased", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_tenants")) return [{ plan: "starter" }];
      if (sql.includes("FROM saas_pack_entitlements"))
        return [entitlementRow({ pack_id: "ecommerce-growth", source: "purchase", launches_remaining: null })];
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    const items = await svc.getStoreCatalog("t1");
    const ecom = items.find((i) => i.id === "ecommerce-growth")!;
    expect(ecom.access).toBe("owned");
    expect(ecom.owned).toBe(true);
    expect(ecom.canLaunch).toBe(true);
  });

  it("purchasable pack (not in plan, no entitlement) → access=purchasable", async () => {
    const db = makeDb((sql) => (sql.includes("FROM saas_tenants") ? [{ plan: "starter" }] : []));
    const svc = new SaasPackStoreService(db, catalogPort);
    const items = await svc.getStoreCatalog("t1");
    const ecom = items.find((i) => i.id === "ecommerce-growth")!;
    expect(ecom.access).toBe("purchasable");
  });
});

// ── getStoreSummary ─────────────────────────────────────────────────────────────

describe("SaasPackStoreService — getStoreSummary", () => {
  it("counts totals and owned", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_tenants")) return [{ plan: "starter" }];
      if (sql.includes("FROM saas_pack_entitlements"))
        return [entitlementRow({ pack_id: "local-business-growth", launches_remaining: 1 })];
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    const summary = await svc.getStoreSummary("t1");
    expect(summary.totalPacks).toBe(4);
    expect(summary.available).toBe(3);
    expect(summary.owned).toBe(2);
    expect(summary.launchesRemaining).toBe(2);
  });

  it("launchesRemaining=null when an unlimited entitlement exists", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_tenants")) return [{ plan: "agency" }];
      if (sql.includes("FROM saas_pack_entitlements"))
        return [entitlementRow({ launches_remaining: null })];
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    const summary = await svc.getStoreSummary("t1");
    expect(summary.launchesRemaining).toBeNull();
  });
});

// ── getPackDetail ───────────────────────────────────────────────────────────────

describe("SaasPackStoreService — getPackDetail", () => {
  it("returns item + canLaunch + recentLaunches", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_tenants")) return [{ plan: "starter" }];
      if (sql.includes("FROM saas_pack_entitlements") && sql.includes("LIMIT 1"))
        return [entitlementRow({ launches_remaining: 1 })];
      if (sql.includes("FROM saas_pack_entitlements")) return [entitlementRow({ launches_remaining: 1 })];
      if (sql.includes("FROM saas_pack_launches")) return [{ id: "l1", status: "completed" }];
      return [];
    });
    const svc = new SaasPackStoreService(db, catalogPort);
    const detail = await svc.getPackDetail("t1", "local-business-growth");
    expect(detail.item.id).toBe("local-business-growth");
    expect(detail.canLaunch.allowed).toBe(true);
    expect(detail.recentLaunches).toHaveLength(1);
  });

  it("throws NOT_FOUND for unknown pack", async () => {
    const db = makeDb((sql) => (sql.includes("FROM saas_tenants") ? [{ plan: "starter" }] : []));
    const svc = new SaasPackStoreService(db, catalogPort);
    await expect(svc.getPackDetail("t1", "nope")).rejects.toThrow(SaasPackStoreError);
  });
});
