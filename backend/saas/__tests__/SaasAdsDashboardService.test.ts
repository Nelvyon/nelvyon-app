import { describe, it, expect, vi } from "vitest";
import { SaasAdsDashboardService } from "../SaasAdsDashboardService";

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
  it("listConnections returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    expect(await svc.listConnections(TENANT)).toEqual([]);
  });

  it("getStatus returns not connected for all platforms when no connections", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAdsDashboardService(db);
    const status = await svc.getStatus(TENANT);
    expect(status).toHaveLength(4);
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
      platform: "snapchat" as "meta", accountId: "1", accountName: "x", accessToken: "t",
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
});
