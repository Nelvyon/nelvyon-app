import { afterEach, describe, it, expect, vi } from "vitest";
import { SaasAdsDashboardService, resetSaasAdsDashboardServiceForTests } from "../SaasAdsDashboardService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-ads";
const now = new Date();

const connRow = {
  id: "conn1", tenant_id: TENANT, platform: "meta", account_id: "act_123",
  account_name: "My Meta Ads", access_token: "tok", refresh_token: null,
  token_expires_at: null, extra_config: {}, is_active: true, created_at: now,
};

describe("SaasAdsDashboardService", () => {
  afterEach(() => {
    resetSaasAdsDashboardServiceForTests();
    vi.restoreAllMocks();
  });

  it("listConnections returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    expect(await svc.listConnections(TENANT)).toEqual([]);
  });

  it("getStatus returns not connected for all platforms when no connections", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    const status = await svc.getStatus(TENANT);
    expect(status).toHaveLength(5);
    expect(status.every((s) => !s.connected)).toBe(true);
  });

  it("getStatus returns connected for meta", async () => {
    const db = makeDb([[connRow]]);
    const svc = new SaasAdsDashboardService(db);
    const status = await svc.getStatus(TENANT);
    const meta = status.find((s) => s.platform === "meta");
    expect(meta?.connected).toBe(true);
    expect(meta?.accountName).toBe("My Meta Ads");
  });

  it("connectAccount validates platform", async () => {
    const db = makeDb();
    const svc = new SaasAdsDashboardService(db);
    await expect(svc.connectAccount(TENANT, {
      platform: "twitter" as "meta", accountId: "1", accountName: "x", accessToken: "t",
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("connectAccount validates empty accountId", async () => {
    const db = makeDb();
    const svc = new SaasAdsDashboardService(db);
    await expect(svc.connectAccount(TENANT, {
      platform: "google", accountId: "", accountName: "x", accessToken: "t",
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("connectAccount upserts connection", async () => {
    const db = makeDb([[connRow]]);
    const svc = new SaasAdsDashboardService(db);
    const conn = await svc.connectAccount(TENANT, {
      platform: "meta", accountId: "act_123", accountName: "My Meta Ads", accessToken: "tok",
    });
    expect(conn.id).toBe("conn1");
    expect(conn.platform).toBe("meta");
  });

  it("disconnectAccount throws NOT_FOUND for unknown", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    await expect(svc.disconnectAccount(TENANT, "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("getMetrics throws NOT_CONNECTED when no connection", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    await expect(svc.getMetrics(TENANT, "meta", "2026-06-01", "2026-06-30"))
      .rejects.toMatchObject({ code: "NOT_CONNECTED" });
  });

  it("getMetrics returns cached data without calling API", async () => {
    const cacheRow = {
      id: "cache1", connection_id: "conn1", tenant_id: TENANT,
      date_start: "2026-06-01", date_end: "2026-06-30",
      spend: "1500.00", impressions: "100000", clicks: "3200",
      conversions: "48", ctr: "3.2000", cpc: "0.4688", roas: "3.2000",
      fetched_at: now,
    };
    const db = makeDb([[connRow], [cacheRow]]);
    const mockFetch = vi.fn();
    const svc = new SaasAdsDashboardService(db, mockFetch as unknown as typeof fetch);
    const metrics = await svc.getMetrics(TENANT, "meta", "2026-06-01", "2026-06-30");
    expect(metrics.fromCache).toBe(true);
    expect(metrics.spend).toBe(1500);
    expect(metrics.clicks).toBe(3200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("getMetrics fetches live from Meta API and caches result", async () => {
    const metaResponse = {
      data: [{ spend: "2000", impressions: "150000", clicks: "4500", actions: [], action_values: [], ctr: "3.0", cpc: "0.44" }],
    };
    const db = makeDb([[connRow], [], []]); // conn found, cache miss, cache insert
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => metaResponse,
    });
    const svc = new SaasAdsDashboardService(db, mockFetch as unknown as typeof fetch);
    const metrics = await svc.getMetrics(TENANT, "meta", "2026-06-01", "2026-06-30");
    expect(metrics.fromCache).toBe(false);
    expect(metrics.spend).toBe(2000);
    expect(metrics.clicks).toBe(4500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("getMetrics throws API_ERROR on Meta API failure", async () => {
    const db = makeDb([[connRow], []]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ error: { message: "Invalid token" } }),
    });
    const svc = new SaasAdsDashboardService(db, mockFetch as unknown as typeof fetch);
    await expect(svc.getMetrics(TENANT, "meta", "2026-06-01", "2026-06-30"))
      .rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("getMetrics throws API_ERROR for unimplemented platform (linkedin)", async () => {
    const linkedInConn = { ...connRow, platform: "linkedin" };
    const db = makeDb([[linkedInConn], []]);
    const svc = new SaasAdsDashboardService(db);
    await expect(svc.getMetrics(TENANT, "linkedin", "2026-06-01", "2026-06-30"))
      .rejects.toMatchObject({ code: "API_ERROR" });
  });

  // ─── Campaign management ────────────────────────────────────────────────

  it("listCampaigns throws NOT_CONNECTED when no connection", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    await expect(svc.listCampaigns(TENANT, "meta")).rejects.toMatchObject({ code: "NOT_CONNECTED" });
  });

  it("listCampaigns fetches Meta campaigns", async () => {
    const metaResp = {
      data: [
        { id: "c1", name: "Campaña verano", status: "ACTIVE", effective_status: "ACTIVE", daily_budget: "2000" },
        { id: "c2", name: "Campaña retargeting", status: "PAUSED", effective_status: "PAUSED", daily_budget: "1000" },
      ],
    };
    const db = makeDb([[connRow]]);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => metaResp });
    const svc = new SaasAdsDashboardService(db, mockFetch as unknown as typeof fetch);
    const campaigns = await svc.listCampaigns(TENANT, "meta");
    expect(campaigns).toHaveLength(2);
    expect(campaigns[0].id).toBe("c1");
    expect(campaigns[0].status).toBe("ACTIVE");
    expect(campaigns[0].dailyBudget).toBe(20); // 2000 / 100
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("listCampaigns throws API_ERROR on Meta failure", async () => {
    const db = makeDb([[connRow]]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ error: { message: "Invalid token" } }),
    });
    const svc = new SaasAdsDashboardService(db, mockFetch as unknown as typeof fetch);
    await expect(svc.listCampaigns(TENANT, "meta")).rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("listCampaigns throws API_ERROR for linkedin (not implemented)", async () => {
    const linkedInConn = { ...connRow, platform: "linkedin" };
    const db = makeDb([[linkedInConn]]);
    const svc = new SaasAdsDashboardService(db);
    await expect(svc.listCampaigns(TENANT, "linkedin")).rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("setCampaignStatus throws NOT_CONNECTED when no connection", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    await expect(svc.setCampaignStatus(TENANT, "meta", "c1", "PAUSED")).rejects.toMatchObject({ code: "NOT_CONNECTED" });
  });

  it("setCampaignStatus pauses Meta campaign", async () => {
    const db = makeDb([[connRow]]);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const svc = new SaasAdsDashboardService(db, mockFetch as unknown as typeof fetch);
    await expect(svc.setCampaignStatus(TENANT, "meta", "c1", "PAUSED")).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  // ─── ROAS alerts ────────────────────────────────────────────────────────

  it("getRoasAlerts returns empty when no cached data", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    expect(await svc.getRoasAlerts(TENANT)).toEqual([]);
  });

  it("getRoasAlerts returns alert for low-ROAS cached entry", async () => {
    const lowRoasRow = {
      id: "cache1", connection_id: "conn1", tenant_id: TENANT,
      platform: "meta",
      date_start: "2026-05-25", date_end: "2026-06-24",
      spend: "3000.00", impressions: "200000", clicks: "6000",
      conversions: "30", ctr: "3.0000", cpc: "0.5000", roas: "0.8000",
      fetched_at: now,
    };
    const db = makeDb([[lowRoasRow]]);
    const svc = new SaasAdsDashboardService(db);
    const alerts = await svc.getRoasAlerts(TENANT, 1.5);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].roas).toBeCloseTo(0.8);
    expect(alerts[0].threshold).toBe(1.5);
    expect(alerts[0].platform).toBe("meta");
  });

  it("getRoasAlerts excludes entries above threshold", async () => {
    const goodRoasRow = {
      id: "cache2", connection_id: "conn1", tenant_id: TENANT, platform: "google",
      date_start: "2026-05-25", date_end: "2026-06-24",
      spend: "1000.00", impressions: "50000", clicks: "2000",
      conversions: "60", ctr: "4.0000", cpc: "0.5000", roas: "3.5000",
      fetched_at: now,
    };
    const db = makeDb([[goodRoasRow]]);
    const svc = new SaasAdsDashboardService(db);
    const alerts = await svc.getRoasAlerts(TENANT, 1.5);
    expect(alerts).toHaveLength(0);
  });
});
