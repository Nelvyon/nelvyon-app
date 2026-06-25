/**
 * S31 — SaasAffiliateService + SaasLoyaltyService
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { SaasAffiliateService, resetSaasAffiliateServiceForTests } from "../SaasAffiliateService";
import { SaasLoyaltyService, resetSaasLoyaltyServiceForTests } from "../SaasLoyaltyService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const TENANT = "tenant-s31-001";
const CONTACT = "00000000-0000-0000-0000-000000000001";

function now() { return new Date().toISOString(); }

function makeProgram(overrides: Record<string, unknown> = {}) {
  return { id: "prog-1", tenant_id: TENANT, commission_pct: "20.00", cookie_days: 30, active: true, created_at: now(), updated_at: now(), ...overrides };
}
function makeLink(overrides: Record<string, unknown> = {}) {
  return { id: "link-1", tenant_id: TENANT, code: "AFF1234ABCD", affiliate_user_id: "aff@test.com", clicks: 0, conversions: 0, active: true, created_at: now(), ...overrides };
}
function makeCommission(overrides: Record<string, unknown> = {}) {
  return { id: "comm-1", tenant_id: TENANT, link_id: "link-1", affiliate_user_id: "aff@test.com", amount: "200.00", commission_pct: "20.00", commission_amount: "40.00", status: "pending", stripe_transfer_id: null, created_at: now(), updated_at: now(), ...overrides };
}
function makeLoyaltyProgram(overrides: Record<string, unknown> = {}) {
  return { id: "lp-1", tenant_id: TENANT, points_per_eur: "1.00", tiers: '[{"name":"Bronze","min_points":0},{"name":"Silver","min_points":500},{"name":"Gold","min_points":2000},{"name":"Platinum","min_points":5000}]', active: true, created_at: now(), updated_at: now(), ...overrides };
}
function makeBalance(points = 100, tier = "Bronze") {
  return { id: "bal-1", tenant_id: TENANT, contact_id: CONTACT, points, tier, updated_at: now() };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("SaasAffiliateService", () => {
  let db: SaasPostgresPort;
  let svc: SaasAffiliateService;

  beforeEach(() => {
    resetSaasAffiliateServiceForTests();
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    svc = new SaasAffiliateService(db);
  });

  // ── getOrCreateProgram ────────────────────────────────────────────────────

  it("returns existing program", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeProgram()]);
    const p = await svc.getOrCreateProgram(TENANT);
    expect(p.commissionPct).toBe(20);
    expect(p.cookieDays).toBe(30);
  });

  it("creates program if none exists", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([])                // SELECT → nothing
      .mockResolvedValueOnce([makeProgram()]);   // INSERT → new program
    const p = await svc.getOrCreateProgram(TENANT);
    expect(p.commissionPct).toBe(20);
  });

  // ── updateProgram ─────────────────────────────────────────────────────────

  it("updates commission_pct and cookie_days", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeProgram()])                              // getOrCreate: SELECT
      .mockResolvedValueOnce([makeProgram({ commission_pct: "15.00", cookie_days: 60 })]);  // UPDATE
    const p = await svc.updateProgram(TENANT, { commissionPct: 15, cookieDays: 60 });
    expect(p.commissionPct).toBe(15);
    expect(p.cookieDays).toBe(60);
  });

  // ── generateLink ──────────────────────────────────────────────────────────

  it("generates a unique affiliate link", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeProgram()])   // getOrCreateProgram
      .mockResolvedValueOnce([makeLink()]);     // INSERT link
    const link = await svc.generateLink(TENANT, "aff@test.com");
    expect(link.code).toBeTruthy();
    expect(link.affiliateUrl).toContain("?ref=");
  });

  it("rejects empty affiliateUserId", async () => {
    await expect(svc.generateLink(TENANT, "  ")).rejects.toThrow("affiliateUserId");
  });

  // ── listLinks ─────────────────────────────────────────────────────────────

  it("lists links for tenant", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeLink(), makeLink({ id: "link-2", code: "AFFWWWWXXXX" })]);
    const links = await svc.listLinks(TENANT);
    expect(links).toHaveLength(2);
  });

  // ── trackClick ───────────────────────────────────────────────────────────

  it("calls UPDATE on trackClick", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await svc.trackClick(TENANT, "AFF1234ABCD");
    expect(vi.mocked(db.query)).toHaveBeenCalledWith(expect.stringContaining("clicks=clicks+1"), expect.any(Array));
  });

  // ── trackConversion ───────────────────────────────────────────────────────

  it("creates commission on conversion", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeLink()])       // find link
      .mockResolvedValueOnce([makeProgram()])    // getOrCreateProgram SELECT
      .mockResolvedValueOnce([])                 // UPDATE conversions
      .mockResolvedValueOnce([makeCommission()]); // INSERT commission
    const c = await svc.trackConversion(TENANT, "AFF1234ABCD", 200);
    expect(c).not.toBeNull();
    expect(c!.commissionAmount).toBe(40);
  });

  it("returns null when link not found", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);  // no link
    const c = await svc.trackConversion(TENANT, "NOTEXIST", 100);
    expect(c).toBeNull();
  });

  // ── listCommissions ───────────────────────────────────────────────────────

  it("lists all commissions", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeCommission(), makeCommission({ id: "comm-2", status: "approved" })]);
    const comms = await svc.listCommissions(TENANT);
    expect(comms).toHaveLength(2);
  });

  it("filters commissions by status", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeCommission()]);
    const pending = await svc.listCommissions(TENANT, "pending");
    expect(pending[0]?.status).toBe("pending");
  });

  // ── approveCommission ─────────────────────────────────────────────────────

  it("approves a pending commission", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeCommission({ status: "approved" })]);
    const c = await svc.approveCommission(TENANT, "comm-1");
    expect(c.status).toBe("approved");
  });

  it("throws when commission not found for approval", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    await expect(svc.approveCommission(TENANT, "ghost")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  // ── getPayoutSummary ──────────────────────────────────────────────────────

  it("returns correct payout summary", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeProgram()])  // getOrCreateProgram
      .mockResolvedValueOnce([makeLink()])     // listLinks
      .mockResolvedValueOnce([                 // GROUP BY status
        { status: "pending", total: "40.00", cnt: "1" },
        { status: "paid",    total: "80.00", cnt: "2" },
      ]);
    const s = await svc.getPayoutSummary(TENANT);
    expect(s.pendingAmount).toBe(40);
    expect(s.paidAmount).toBe(80);
    expect(s.totalConversions).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("SaasLoyaltyService", () => {
  let db: SaasPostgresPort;
  let svc: SaasLoyaltyService;

  beforeEach(() => {
    resetSaasLoyaltyServiceForTests();
    db = { query: vi.fn() } as unknown as SaasPostgresPort;
    svc = new SaasLoyaltyService(db);
  });

  // ── getOrCreateProgram ────────────────────────────────────────────────────

  it("returns existing loyalty program", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeLoyaltyProgram()]);
    const p = await svc.getOrCreateProgram(TENANT);
    expect(p.pointsPerEur).toBe(1);
    expect(p.tiers).toHaveLength(4);
  });

  it("creates loyalty program when none exists", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeLoyaltyProgram()]);
    const p = await svc.getOrCreateProgram(TENANT);
    expect(p.tiers[0]?.name).toBe("Bronze");
  });

  // ── updateProgram ─────────────────────────────────────────────────────────

  it("updates points_per_eur", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeLoyaltyProgram()])  // getOrCreate
      .mockResolvedValueOnce([makeLoyaltyProgram({ points_per_eur: "2.50" })]);  // UPDATE
    const p = await svc.updateProgram(TENANT, { pointsPerEur: 2.5 });
    expect(p.pointsPerEur).toBe(2.5);
  });

  // ── earnPoints ────────────────────────────────────────────────────────────

  it("earns correct points (floor)", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeLoyaltyProgram({ points_per_eur: "1.00" })])  // getOrCreate
      .mockResolvedValueOnce([])  // UPSERT balance
      .mockResolvedValueOnce([])  // INSERT txn
      .mockResolvedValueOnce([makeBalance(150, "Bronze")])  // refresh
      .mockResolvedValueOnce([]);  // no tier upgrade needed (Bronze stays)
    const b = await svc.earnPoints(TENANT, CONTACT, 150, "Compra #1");
    expect(b.points).toBe(150);
  });

  it("upgrades tier when points exceed threshold", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeLoyaltyProgram()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeBalance(600, "Bronze")])  // balance after earn
      .mockResolvedValueOnce([]);  // UPDATE tier → Silver
    const b = await svc.earnPoints(TENANT, CONTACT, 600);
    expect(b.tier).toBe("Silver");
  });

  it("throws VALIDATION when amount too small", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeLoyaltyProgram()]);
    await expect(svc.earnPoints(TENANT, CONTACT, 0.001)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  // ── redeemPoints ──────────────────────────────────────────────────────────

  it("redeems points when balance sufficient", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeLoyaltyProgram()])        // getOrCreate
      .mockResolvedValueOnce([makeBalance(500)])             // getBalance (for check)
      .mockResolvedValueOnce([])                            // UPDATE balance
      .mockResolvedValueOnce([])                            // INSERT txn
      .mockResolvedValueOnce([makeBalance(350)])            // refresh
      .mockResolvedValueOnce([]);                           // no tier downgrade
    const b = await svc.redeemPoints(TENANT, CONTACT, 150, "Cupón 10€");
    expect(b.points).toBe(350);
  });

  it("throws INSUFFICIENT when balance too low", async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce([makeLoyaltyProgram()])
      .mockResolvedValueOnce([makeBalance(50)]);
    await expect(svc.redeemPoints(TENANT, CONTACT, 200)).rejects.toMatchObject({ code: "INSUFFICIENT" });
  });

  it("throws VALIDATION for zero points", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeLoyaltyProgram()]);
    await expect(svc.redeemPoints(TENANT, CONTACT, 0)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  // ── getBalance ────────────────────────────────────────────────────────────

  it("returns zero balance for unregistered contact", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    const b = await svc.getBalance(TENANT, CONTACT);
    expect(b.points).toBe(0);
    expect(b.tier).toBe("Bronze");
  });

  it("returns existing balance", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeBalance(2500, "Gold")]);
    const b = await svc.getBalance(TENANT, CONTACT);
    expect(b.points).toBe(2500);
    expect(b.tier).toBe("Gold");
  });

  // ── listBalances ──────────────────────────────────────────────────────────

  it("returns balances ordered by points desc", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([makeBalance(5000, "Platinum"), makeBalance(100, "Bronze")]);
    const list = await svc.listBalances(TENANT);
    expect(list[0]?.points).toBe(5000);
    expect(list[1]?.tier).toBe("Bronze");
  });

  // ── getTransactions ───────────────────────────────────────────────────────

  it("returns transaction history", async () => {
    const txn = { id: "t1", tenant_id: TENANT, contact_id: CONTACT, type: "earn", points: 100, reason: "test", reference_id: null, created_at: now() };
    vi.mocked(db.query).mockResolvedValueOnce([txn]);
    const txns = await svc.getTransactions(TENANT, CONTACT);
    expect(txns).toHaveLength(1);
    expect(txns[0]?.type).toBe("earn");
    expect(txns[0]?.points).toBe(100);
  });
});
