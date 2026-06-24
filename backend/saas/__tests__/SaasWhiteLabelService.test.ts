import { describe, it, expect, vi, beforeAll } from "vitest";
import { SaasWhiteLabelService } from "../SaasWhiteLabelService";

// Provide a dummy key so stripeRequest doesn't throw NOT_CONFIGURED in unit tests
beforeAll(() => { process.env.STRIPE_SECRET_KEY = "sk_test_unit_mock"; });

type Row = Record<string, unknown>;

const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const makeFetch = (responses: Array<{ ok: boolean; data: unknown }>) => {
  let call = 0;
  return vi.fn(async () => {
    const r = responses[call++] ?? { ok: false, data: { error: { message: "fail" } } };
    return { ok: r.ok, status: r.ok ? 200 : 400, json: async () => r.data };
  });
};

const TENANT = "tenant-wl";

const baseConfig: Row = {
  id: "wl-1",
  tenantId: TENANT,
  agencyName: "Test Agency",
  logoUrl: null,
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  customDomain: null,
  faviconUrl: null,
  supportEmail: null,
  footerText: null,
  hideNelvyonBranding: false,
  active: true,
  stripeConnectAccountId: null,
  stripeConnectStatus: "not_connected",
  stripeChargesEnabled: false,
  stripePayoutsEnabled: false,
  stripeConnectOnboardedAt: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("SaasWhiteLabelService — getConfig", () => {
  it("returns null when no config", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWhiteLabelService({ db });
    expect(await svc.getConfig(TENANT)).toBeNull();
  });

  it("returns config with stripe fields", async () => {
    const db = makeDb([[baseConfig]]);
    const svc = new SaasWhiteLabelService({ db });
    const config = await svc.getConfig(TENANT);
    expect(config?.agencyName).toBe("Test Agency");
    expect(config?.stripeConnectStatus).toBe("not_connected");
    expect(config?.stripeChargesEnabled).toBe(false);
  });
});

describe("SaasWhiteLabelService — upsertConfig", () => {
  it("upserts and returns config", async () => {
    const db = makeDb([[baseConfig]]);
    const svc = new SaasWhiteLabelService({ db });
    const result = await svc.upsertConfig(TENANT, { agencyName: "My Agency" });
    expect(result.agencyName).toBe("Test Agency");
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("ON CONFLICT");
  });

  it("throws when DB returns no row", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWhiteLabelService({ db });
    await expect(svc.upsertConfig(TENANT, { agencyName: "X" })).rejects.toThrow("upsert returned no row");
  });
});

describe("SaasWhiteLabelService — getStripeConnectStatus", () => {
  it("returns not_connected when no account", async () => {
    const db = makeDb([[{ ...baseConfig, stripeConnectAccountId: null }]]);
    const svc = new SaasWhiteLabelService({ db });
    const status = await svc.getStripeConnectStatus(TENANT);
    expect(status.connected).toBe(false);
    expect(status.status).toBe("not_connected");
  });

  it("returns active status from DB when account exists", async () => {
    const db = makeDb([[{ ...baseConfig, stripeConnectAccountId: "acct_test", stripeConnectStatus: "active", stripeChargesEnabled: true, stripePayoutsEnabled: true }]]);
    const svc = new SaasWhiteLabelService({ db });
    const status = await svc.getStripeConnectStatus(TENANT);
    expect(status.connected).toBe(true);
    expect(status.accountId).toBe("acct_test");
    expect(status.chargesEnabled).toBe(true);
  });
});

describe("SaasWhiteLabelService — createStripeConnectAccount", () => {
  it("calls Stripe API and saves account id", async () => {
    // getConfig → no existing account
    const db = makeDb([[{ ...baseConfig, stripeConnectAccountId: null }], []]);
    const fetchFn = makeFetch([{ ok: true, data: { id: "acct_new_123" } }]);
    const svc = new SaasWhiteLabelService({ db, fetchFn });
    const result = await svc.createStripeConnectAccount(TENANT, "agency@test.com", "Agency LLC");
    expect(result.accountId).toBe("acct_new_123");
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining("/accounts"),
      expect.objectContaining({ method: "POST" }),
    );
    const insertCall = db.query.mock.calls[1];
    expect(String(insertCall[0])).toContain("stripe_connect_account_id");
  });

  it("skips Stripe call when account already exists", async () => {
    const db = makeDb([[{ ...baseConfig, stripeConnectAccountId: "acct_existing" }]]);
    const fetchFn = makeFetch([]);
    const svc = new SaasWhiteLabelService({ db, fetchFn });
    const result = await svc.createStripeConnectAccount(TENANT, "x@test.com", "X");
    expect(result.accountId).toBe("acct_existing");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("throws when Stripe returns error", async () => {
    const db = makeDb([[{ ...baseConfig, stripeConnectAccountId: null }]]);
    const fetchFn = makeFetch([{ ok: false, data: { error: { message: "Invalid email" } } }]);
    const svc = new SaasWhiteLabelService({ db, fetchFn });
    await expect(svc.createStripeConnectAccount(TENANT, "bad", "X")).rejects.toMatchObject({ code: "STRIPE_ERROR" });
  });
});

describe("SaasWhiteLabelService — getStripeConnectOnboardingUrl", () => {
  it("throws NOT_CONNECTED when no account", async () => {
    const db = makeDb([[{ ...baseConfig, stripeConnectAccountId: null }]]);
    const svc = new SaasWhiteLabelService({ db });
    await expect(svc.getStripeConnectOnboardingUrl(TENANT, "https://return", "https://refresh"))
      .rejects.toMatchObject({ code: "NOT_CONNECTED" });
  });

  it("returns onboarding URL from Stripe", async () => {
    const db = makeDb([[{ ...baseConfig, stripeConnectAccountId: "acct_test" }]]);
    const fetchFn = makeFetch([{ ok: true, data: { url: "https://connect.stripe.com/setup/..." } }]);
    const svc = new SaasWhiteLabelService({ db, fetchFn });
    const result = await svc.getStripeConnectOnboardingUrl(TENANT, "https://return", "https://refresh");
    expect(result.url).toContain("stripe.com");
  });
});

describe("SaasWhiteLabelService — syncStripeConnectStatus", () => {
  it("returns not_connected when no account in DB", async () => {
    const db = makeDb([[{ ...baseConfig, stripeConnectAccountId: null }]]);
    const svc = new SaasWhiteLabelService({ db });
    const status = await svc.syncStripeConnectStatus(TENANT);
    expect(status.status).toBe("not_connected");
  });

  it("syncs active status when charges_enabled=true", async () => {
    const db = makeDb([
      [{ ...baseConfig, stripeConnectAccountId: "acct_test", stripeConnectOnboardedAt: null }],
      [], // UPDATE
    ]);
    const fetchFn = makeFetch([{ ok: true, data: { charges_enabled: true, payouts_enabled: true, details_submitted: true } }]);
    const svc = new SaasWhiteLabelService({ db, fetchFn });
    const status = await svc.syncStripeConnectStatus(TENANT);
    expect(status.status).toBe("active");
    expect(status.chargesEnabled).toBe(true);
    expect(status.onboardedAt).toBeTruthy();
    const updateCall = db.query.mock.calls[1];
    expect(String(updateCall[0])).toContain("stripe_connect_status");
  });

  it("syncs restricted when details_submitted but charges not enabled", async () => {
    const db = makeDb([
      [{ ...baseConfig, stripeConnectAccountId: "acct_test", stripeConnectOnboardedAt: null }],
      [],
    ]);
    const fetchFn = makeFetch([{ ok: true, data: { charges_enabled: false, payouts_enabled: false, details_submitted: true } }]);
    const svc = new SaasWhiteLabelService({ db, fetchFn });
    const status = await svc.syncStripeConnectStatus(TENANT);
    expect(status.status).toBe("restricted");
  });
});

describe("SaasWhiteLabelService — deactivate", () => {
  it("returns false when no config", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWhiteLabelService({ db });
    expect(await svc.deactivate(TENANT)).toBe(false);
  });

  it("returns true when deactivated", async () => {
    const db = makeDb([[{ id: "wl-1" }]]);
    const svc = new SaasWhiteLabelService({ db });
    expect(await svc.deactivate(TENANT)).toBe(true);
  });
});
