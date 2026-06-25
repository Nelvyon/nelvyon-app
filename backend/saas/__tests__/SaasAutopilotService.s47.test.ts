/**
 * S47 — SaasAutopilotService unit tests
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SaasAutopilotService, SaasAutopilotError } from "../SaasAutopilotService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

// ── Stable mocks for dynamic imports ─────────────────────────────────────────

const mockGenerateMonthly = vi.fn().mockResolvedValue([
  { id: "del-1", serviceType: "seo_report", tenantId: "t1", month: "2026-06", status: "generated", payload: {}, createdAt: new Date().toISOString() },
  { id: "del-2", serviceType: "social_calendar", tenantId: "t1", month: "2026-06", status: "generated", payload: {}, createdAt: new Date().toISOString() },
  { id: "del-3", serviceType: "ads_snapshot", tenantId: "t1", month: "2026-06", status: "generated", payload: {}, createdAt: new Date().toISOString() },
]);
const mockSyncGbp = vi.fn().mockResolvedValue({ synced: 5, newNegative: 1 });
const mockListConnections = vi.fn().mockResolvedValue([{ id: "c1", platform: "meta", accountId: "acc1", accountName: "Acme Meta", isActive: true, tokenExpiresAt: null, createdAt: new Date().toISOString() }]);
const mockGetMetrics = vi.fn().mockResolvedValue({ platform: "meta", spend: 100, impressions: 5000 });

vi.mock("../OsRecurringServicesService", () => ({
  getOsRecurringServicesService: () => ({ generateMonthlyDeliverables: mockGenerateMonthly }),
}));
vi.mock("../SaasReputationService", () => ({
  getSaasReputationService: () => ({ syncGbpReviews: mockSyncGbp }),
}));
vi.mock("../SaasAdsDashboardService", () => ({
  getSaasAdsDashboardService: () => ({ listConnections: mockListConnections, getMetrics: mockGetMetrics }),
}));

// ── DB mock helper ─────────────────────────────────────────────────────────────

const SETTINGS_ROW = {
  tenant_id: "t1",
  seo_enabled: false,
  social_enabled: false,
  reputation_enabled: false,
  ads_enabled: false,
  seo_day_of_month: 1,
  social_day_of_month: 1,
  last_seo_run_at: null,
  last_social_run_at: null,
  last_reputation_run_at: null,
  last_ads_run_at: null,
  updated_at: new Date().toISOString(),
};

function makeDb(responses: unknown[]): SaasPostgresPort {
  let call = 0;
  return {
    query: vi.fn().mockImplementation(async () => {
      const res = responses[call] ?? [];
      call++;
      return res;
    }),
  } as unknown as SaasPostgresPort;
}

beforeEach(() => {
  mockGenerateMonthly.mockClear();
  mockSyncGbp.mockClear();
  mockListConnections.mockClear();
  mockGetMetrics.mockClear();
});

// ── getSettings ────────────────────────────────────────────────────────────────

describe("SaasAutopilotService — getSettings", () => {
  it("returns settings via UPSERT returning *", async () => {
    const db = makeDb([[SETTINGS_ROW]]);
    const svc = new SaasAutopilotService(db);
    const s = await svc.getSettings("t1");
    expect(s.tenantId).toBe("t1");
    expect(s.seoEnabled).toBe(false);
    expect(s.seoDayOfMonth).toBe(1);
  });

  it("maps all fields correctly", async () => {
    const row = { ...SETTINGS_ROW, seo_enabled: true, last_seo_run_at: "2026-06-01T08:00:00Z" };
    const db = makeDb([[row]]);
    const svc = new SaasAutopilotService(db);
    const s = await svc.getSettings("t1");
    expect(s.seoEnabled).toBe(true);
    expect(s.lastSeoRunAt).toBe("2026-06-01T08:00:00Z");
  });
});

// ── updateSettings ─────────────────────────────────────────────────────────────

describe("SaasAutopilotService — updateSettings", () => {
  it("updates seoEnabled to true", async () => {
    const updated = { ...SETTINGS_ROW, seo_enabled: true };
    // UPDATE returns row; then getSettings UPSERT not needed because row exists
    const db = makeDb([[updated]]);
    const svc = new SaasAutopilotService(db);
    const s = await svc.updateSettings("t1", { seoEnabled: true });
    expect(s.seoEnabled).toBe(true);
  });

  it("updates multiple fields at once", async () => {
    const updated = { ...SETTINGS_ROW, seo_enabled: true, social_enabled: true, seo_day_of_month: 15 };
    const db = makeDb([[updated]]);
    const svc = new SaasAutopilotService(db);
    const s = await svc.updateSettings("t1", { seoEnabled: true, socialEnabled: true, seoDayOfMonth: 15 });
    expect(s.seoEnabled).toBe(true);
    expect(s.socialEnabled).toBe(true);
    expect(s.seoDayOfMonth).toBe(15);
  });

  it("throws VALIDATION when seoDayOfMonth < 1", async () => {
    const db = makeDb([]);
    const svc = new SaasAutopilotService(db);
    await expect(svc.updateSettings("t1", { seoDayOfMonth: 0 })).rejects.toThrow(SaasAutopilotError);
  });

  it("throws VALIDATION when seoDayOfMonth > 28", async () => {
    const db = makeDb([]);
    const svc = new SaasAutopilotService(db);
    await expect(svc.updateSettings("t1", { seoDayOfMonth: 29 })).rejects.toThrow(SaasAutopilotError);
  });

  it("validation error code is VALIDATION", async () => {
    const db = makeDb([]);
    const svc = new SaasAutopilotService(db);
    try {
      await svc.updateSettings("t1", { seoDayOfMonth: 31 });
    } catch (e) {
      expect((e as SaasAutopilotError).code).toBe("VALIDATION");
    }
  });

  it("fallback getSettings when UPDATE returns no row", async () => {
    // UPDATE returns [] (no matching tenant_id), fallback UPSERT
    const db = makeDb([[], [SETTINGS_ROW]]);
    const svc = new SaasAutopilotService(db);
    const s = await svc.updateSettings("t1", { seoEnabled: true });
    expect(s.tenantId).toBe("t1");
  });
});

// ── getStatus ──────────────────────────────────────────────────────────────────

describe("SaasAutopilotService — getStatus", () => {
  it("activeCount is 0 when all disabled", async () => {
    const db = makeDb([[SETTINGS_ROW]]);
    const svc = new SaasAutopilotService(db);
    const st = await svc.getStatus("t1");
    expect(st.activeCount).toBe(0);
  });

  it("activeCount increments per enabled service", async () => {
    const row = { ...SETTINGS_ROW, seo_enabled: true, social_enabled: true };
    const db = makeDb([[row]]);
    const svc = new SaasAutopilotService(db);
    const st = await svc.getStatus("t1");
    expect(st.activeCount).toBe(2);
  });

  it("nextSeoRun is null when seo disabled", async () => {
    const db = makeDb([[SETTINGS_ROW]]);
    const svc = new SaasAutopilotService(db);
    const st = await svc.getStatus("t1");
    expect(st.nextSeoRun).toBeNull();
  });

  it("nextSeoRun is ISO string when seo enabled", async () => {
    const row = { ...SETTINGS_ROW, seo_enabled: true };
    const db = makeDb([[row]]);
    const svc = new SaasAutopilotService(db);
    const st = await svc.getStatus("t1");
    expect(st.nextSeoRun).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── runNow ────────────────────────────────────────────────────────────────────

describe("SaasAutopilotService — runNow", () => {
  it("runNow seo calls generateMonthlyDeliverables and returns seo deliverable", async () => {
    // getSettings call + _markLastRun UPDATE
    const db = makeDb([[SETTINGS_ROW], []]);
    const svc = new SaasAutopilotService(db);
    const result = await svc.runNow("t1", "seo");
    expect(mockGenerateMonthly).toHaveBeenCalledOnce();
    expect(result.service).toBe("seo");
    expect(result.success).toBe(true);
    expect(result.deliverableId).toBe("del-1");
  });

  it("runNow social calls generateMonthlyDeliverables and returns social deliverable", async () => {
    const db = makeDb([[SETTINGS_ROW], []]);
    const svc = new SaasAutopilotService(db);
    const result = await svc.runNow("t1", "social");
    expect(result.service).toBe("social");
    expect(result.deliverableId).toBe("del-2");
  });

  it("runNow reputation calls syncGbpReviews", async () => {
    const db = makeDb([[SETTINGS_ROW], []]);
    const svc = new SaasAutopilotService(db);
    const result = await svc.runNow("t1", "reputation");
    expect(mockSyncGbp).toHaveBeenCalledWith("t1");
    expect(result.service).toBe("reputation");
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/5 reviews/);
  });

  it("runNow ads refreshes metrics for all connections", async () => {
    const db = makeDb([[SETTINGS_ROW], []]);
    const svc = new SaasAutopilotService(db);
    const result = await svc.runNow("t1", "ads");
    expect(mockListConnections).toHaveBeenCalledWith("t1");
    expect(mockGetMetrics).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/1\/1/);
  });

  it("runNow ads returns success=false when no connections", async () => {
    mockListConnections.mockResolvedValueOnce([]);
    const db = makeDb([[SETTINGS_ROW], []]);
    const svc = new SaasAutopilotService(db);
    const result = await svc.runNow("t1", "ads");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/sin conexiones/i);
  });

  it("runNow seo message says 'ya existía' when generateMonthly returns []", async () => {
    mockGenerateMonthly.mockResolvedValueOnce([]);
    const db = makeDb([[SETTINGS_ROW], []]);
    const svc = new SaasAutopilotService(db);
    const result = await svc.runNow("t1", "seo");
    expect(result.message).toMatch(/ya existía/);
  });
});

// ── listEligibleTenants ────────────────────────────────────────────────────────

describe("SaasAutopilotService — listEligibleTenants", () => {
  it("returns tenant_ids from query", async () => {
    const db = makeDb([[{ tenant_id: "t1" }, { tenant_id: "t2" }]]);
    const svc = new SaasAutopilotService(db);
    const ids = await svc.listEligibleTenants();
    expect(ids).toEqual(["t1", "t2"]);
  });

  it("returns empty array when no enabled tenants", async () => {
    const db = makeDb([[]]); // empty result
    const svc = new SaasAutopilotService(db);
    const ids = await svc.listEligibleTenants();
    expect(ids).toHaveLength(0);
  });

  it("uses OR across all 4 toggle columns", async () => {
    const db = makeDb([[{ tenant_id: "t1" }]]) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new SaasAutopilotService(db);
    await svc.listEligibleTenants();
    const sql = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toMatch(/seo_enabled.*social_enabled.*reputation_enabled.*ads_enabled/is);
  });
});
