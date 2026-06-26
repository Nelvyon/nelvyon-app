/**
 * S54 — SaasPartnerZoneService unit tests
 */
import { describe, expect, it, vi } from "vitest";
import {
  SaasPartnerZoneService,
  SaasPartnerZoneError,
  WHOLESALE_CATALOG,
  type PartnerZonePorts,
  type ConnectStatus,
} from "../SaasPartnerZoneService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const NO_CONNECT: ConnectStatus = {
  connected: false, accountId: null, status: "not_connected",
  chargesEnabled: false, payoutsEnabled: false, onboardedAt: null,
};

function makePorts(over: Partial<PartnerZonePorts> = {}): PartnerZonePorts {
  return {
    subcuentas: { list: async () => [] },
    whiteLabel: {
      getStripeConnectStatus: async () => NO_CONNECT,
      createStripeConnectAccount: async () => ({ accountId: "acct_1" }),
      getStripeConnectOnboardingUrl: async () => ({ url: "https://connect.stripe/onboard" }),
    },
    partners: {
      getPartner: async () => null,
      registerPartner: async () => ({ id: "p1", referralCode: "REF123" }),
      getReferrals: async () => [],
    },
    ...over,
  };
}

function planDb(plan: string, extra?: (sql: string) => unknown[] | null): SaasPostgresPort {
  return makeDb((sql) => {
    if (sql.includes("FROM saas_tenants")) return [{ plan }];
    const r = extra?.(sql);
    return r ?? [];
  });
}

// ── getPartnerEligibility ───────────────────────────────────────────────────────

describe("SaasPartnerZoneService — getPartnerEligibility", () => {
  it("agency plan is eligible", async () => {
    const svc = new SaasPartnerZoneService(planDb("agency"), makePorts());
    const e = await svc.getPartnerEligibility("t1");
    expect(e.eligible).toBe(true);
    expect(e.reason).toBe("plan");
  });

  it("agency_partner plan is eligible", async () => {
    const svc = new SaasPartnerZoneService(planDb("agency_partner"), makePorts());
    expect((await svc.getPartnerEligibility("t1")).eligible).toBe(true);
  });

  it("pro plan is not eligible", async () => {
    const svc = new SaasPartnerZoneService(planDb("pro"), makePorts());
    const e = await svc.getPartnerEligibility("t1");
    expect(e.eligible).toBe(false);
    expect(e.reason).toBe("not_eligible");
  });

  it("defaults to starter when no tenant row", async () => {
    const svc = new SaasPartnerZoneService(makeDb(() => []), makePorts());
    const e = await svc.getPartnerEligibility("t1");
    expect(e.plan).toBe("starter");
    expect(e.eligible).toBe(false);
  });
});

// ── getWholesaleCatalog ─────────────────────────────────────────────────────────

describe("SaasPartnerZoneService — getWholesaleCatalog", () => {
  it("returns full catalog with suggested retail when no overrides", async () => {
    const svc = new SaasPartnerZoneService(makeDb(() => []), makePorts());
    const cat = await svc.getWholesaleCatalog("t1");
    expect(cat).toHaveLength(WHOLESALE_CATALOG.length);
    const pro = cat.find((c) => c.sku === "plan_pro")!;
    expect(pro.retailEur).toBe(199);
    expect(pro.marginEur).toBe(120);
    expect(pro.hasOverride).toBe(false);
  });

  it("applies retail override", async () => {
    const db = makeDb((sql) =>
      sql.includes("FROM saas_partner_retail_prices")
        ? [{ sku: "plan_pro", wholesale_eur: "79", retail_eur: "250", currency: "eur", active: true, updated_at: "" }]
        : [],
    );
    const svc = new SaasPartnerZoneService(db, makePorts());
    const cat = await svc.getWholesaleCatalog("t1");
    const pro = cat.find((c) => c.sku === "plan_pro")!;
    expect(pro.retailEur).toBe(250);
    expect(pro.marginEur).toBe(171);
    expect(pro.hasOverride).toBe(true);
  });

  it("survives missing prices table", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_partner_retail_prices")) throw new Error("no table");
      return [];
    });
    const svc = new SaasPartnerZoneService(db, makePorts());
    expect(await svc.getWholesaleCatalog("t1")).toHaveLength(WHOLESALE_CATALOG.length);
  });
});

// ── upsertRetailPrice ───────────────────────────────────────────────────────────

describe("SaasPartnerZoneService — upsertRetailPrice", () => {
  it("upserts a valid retail price", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_partner_retail_prices"))
        return [{ sku: "plan_pro", wholesale_eur: "79", retail_eur: "300", currency: "eur", active: true, updated_at: "" }];
      return [];
    });
    const svc = new SaasPartnerZoneService(db, makePorts());
    const item = await svc.upsertRetailPrice("t1", "plan_pro", 300);
    expect(item.retailEur).toBe(300);
  });

  it("rejects retail below wholesale", async () => {
    const svc = new SaasPartnerZoneService(makeDb(() => []), makePorts());
    await expect(svc.upsertRetailPrice("t1", "plan_pro", 50)).rejects.toThrow(SaasPartnerZoneError);
  });

  it("VALIDATION code on too-low retail", async () => {
    const svc = new SaasPartnerZoneService(makeDb(() => []), makePorts());
    try {
      await svc.upsertRetailPrice("t1", "plan_pro", 10);
    } catch (e) {
      expect((e as SaasPartnerZoneError).code).toBe("VALIDATION");
    }
  });

  it("throws NOT_FOUND for unknown sku", async () => {
    const svc = new SaasPartnerZoneService(makeDb(() => []), makePorts());
    await expect(svc.upsertRetailPrice("t1", "nope", 100)).rejects.toThrow(SaasPartnerZoneError);
  });
});

// ── listLedger ──────────────────────────────────────────────────────────────────

describe("SaasPartnerZoneService — listLedger", () => {
  it("merges connect + partner rows and totals", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM saas_connect_rebilling"))
        return [{ gross_amount_eur: "100", net_agency_eur: "40", status: "transferred", description: "sub1", created_at: "2026-06-02T00:00:00Z" }];
      if (sql.includes("FROM partner_rebilling_ledger"))
        return [{ gross_eur: "200", wholesale_eur: "120", partner_margin_eur: "80", currency: "eur", description: "ref1", created_at: "2026-06-03T00:00:00Z" }];
      return [];
    });
    const svc = new SaasPartnerZoneService(db, makePorts());
    const { entries, totals } = await svc.listLedger("t1");
    expect(entries).toHaveLength(2);
    expect(totals.gross).toBe(300);
    expect(totals.margin).toBe(120);
    // newest first
    expect(entries[0]!.source).toBe("partner");
  });

  it("maps connect wholesale as gross-margin", async () => {
    const db = makeDb((sql) =>
      sql.includes("FROM saas_connect_rebilling")
        ? [{ gross_amount_eur: "100", net_agency_eur: "30", status: "pending", description: null, created_at: "2026-06-01T00:00:00Z" }]
        : [],
    );
    const svc = new SaasPartnerZoneService(db, makePorts());
    const { entries } = await svc.listLedger("t1");
    expect(entries[0]!.wholesaleEur).toBe(70);
    expect(entries[0]!.marginEur).toBe(30);
  });

  it("returns empty totals when no ledger rows", async () => {
    const svc = new SaasPartnerZoneService(makeDb(() => []), makePorts());
    const { entries, totals } = await svc.listLedger("t1");
    expect(entries).toHaveLength(0);
    expect(totals).toEqual({ gross: 0, wholesale: 0, margin: 0 });
  });
});

// ── getZoneSummary ──────────────────────────────────────────────────────────────

describe("SaasPartnerZoneService — getZoneSummary", () => {
  it("aggregates subaccounts, ledger and connect", async () => {
    const db = planDb("agency", (sql) => {
      if (sql.includes("FROM saas_connect_rebilling"))
        return [{ gross_amount_eur: "100", net_agency_eur: "40", status: "transferred", description: null, created_at: "2026-06-02T00:00:00Z" }];
      return null;
    });
    const ports = makePorts({
      subcuentas: { list: async () => [
        { id: "s1", name: "Cliente 1", status: "active" },
        { id: "s2", name: "Cliente 2", status: "suspended" },
      ] },
    });
    const svc = new SaasPartnerZoneService(db, ports);
    const summary = await svc.getZoneSummary("t1", "u1");
    expect(summary.eligible).toBe(true);
    expect(summary.subcuentasActive).toBe(1);
    expect(summary.recentSubcuentas).toHaveLength(2);
    expect(summary.grossTotal).toBe(100);
    expect(summary.marginTotal).toBe(40);
  });

  it("includes referral code when partner exists", async () => {
    const ports = makePorts({
      partners: {
        getPartner: async () => ({ id: "p1", referralCode: "ZONE99" }),
        registerPartner: async () => ({ id: "p1", referralCode: "ZONE99" }),
        getReferrals: async () => [],
      },
    });
    const svc = new SaasPartnerZoneService(planDb("agency"), ports);
    const summary = await svc.getZoneSummary("t1", "u1");
    expect(summary.referralCode).toBe("ZONE99");
  });
});

// ── connect + referrals delegates ───────────────────────────────────────────────

describe("SaasPartnerZoneService — delegates", () => {
  it("startConnectOnboarding returns url for eligible tenant", async () => {
    const svc = new SaasPartnerZoneService(planDb("agency"), makePorts());
    const { url } = await svc.startConnectOnboarding("t1", { email: "a@b.com", businessName: "Acme", returnUrl: "/r", refreshUrl: "/f" });
    expect(url).toContain("stripe");
  });

  it("startConnectOnboarding blocks non-eligible plan", async () => {
    const svc = new SaasPartnerZoneService(planDb("pro"), makePorts());
    await expect(
      svc.startConnectOnboarding("t1", { email: "a@b.com", businessName: "Acme", returnUrl: "/r", refreshUrl: "/f" }),
    ).rejects.toThrow(SaasPartnerZoneError);
  });

  it("getReferralStats throws NOT_FOUND when not a partner", async () => {
    const svc = new SaasPartnerZoneService(planDb("agency"), makePorts());
    await expect(svc.getReferralStats("t1", "u1")).rejects.toThrow(SaasPartnerZoneError);
  });

  it("registerAsPartner returns existing partner if present", async () => {
    const ports = makePorts({
      partners: {
        getPartner: async () => ({ id: "p9", referralCode: "EXIST" }),
        registerPartner: async () => ({ id: "pNew", referralCode: "NEW" }),
        getReferrals: async () => [],
      },
    });
    const svc = new SaasPartnerZoneService(planDb("agency"), ports);
    const p = await svc.registerAsPartner("u1", "t1");
    expect(p.referralCode).toBe("EXIST");
  });
});
