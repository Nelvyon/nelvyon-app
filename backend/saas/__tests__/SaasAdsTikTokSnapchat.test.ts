import { describe, it, expect, vi } from "vitest";
import { SaasAdsDashboardService } from "../SaasAdsDashboardService";

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };
type FetchFn = typeof fetch;

function makeSvc(db: Partial<DbPort>, fetchFn?: FetchFn) {
  return new SaasAdsDashboardService(db as DbPort, fetchFn ?? (async () => new Response("{}", { status: 200 })));
}

const tiktokConn = {
  id: "c-tt", tenant_id: "t1", platform: "tiktok", account_id: "7000000001",
  account_name: "Test TikTok", access_token: "ttok-abc", refresh_token: null,
  token_expires_at: null, extra_config: {}, is_active: true, created_at: new Date(),
};

const snapConn = {
  id: "c-sc", tenant_id: "t1", platform: "snapchat", account_id: "snap-acct-123",
  account_name: "Test Snap", access_token: "snap-bearer-xyz", refresh_token: null,
  token_expires_at: null, extra_config: {}, is_active: true, created_at: new Date(),
};

function connDb(conn: typeof tiktokConn | typeof snapConn) {
  return { query: async () => [conn] as never };
}

// ── TikTok listCampaigns ──────────────────────────────────────────────────────

describe("TikTok listCampaigns", () => {
  it("maps API response to AdsCampaign array", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        code: 0, data: { list: [
          { campaign_id: "tt-1", campaign_name: "Summer", operation_status: "ENABLE", budget: "20" },
          { campaign_id: "tt-2", campaign_name: "Brand", operation_status: "DISABLE", budget: "50" },
        ] },
      }), { status: 200 }),
    );
    const svc = makeSvc(connDb(tiktokConn), fetch as unknown as FetchFn);
    const cs = await svc.listCampaigns("t1", "tiktok");
    expect(cs).toHaveLength(2);
    expect(cs[0].id).toBe("tt-1");
    expect(cs[0].status).toBe("ACTIVE");
    expect(cs[1].status).toBe("PAUSED");
    expect(cs[0].platform).toBe("tiktok");
  });

  it("throws API_ERROR when TikTok returns non-zero code", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: 40001, message: "Invalid advertiser_id" }), { status: 200 }),
    );
    const svc = makeSvc(connDb(tiktokConn), fetch as unknown as FetchFn);
    await expect(svc.listCampaigns("t1", "tiktok")).rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("throws NOT_CONNECTED when no active TikTok connection", async () => {
    const svc = makeSvc({ query: async () => [] as never });
    await expect(svc.listCampaigns("t1", "tiktok")).rejects.toMatchObject({ code: "NOT_CONNECTED" });
  });

  it("sends Access-Token header (not Bearer)", async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetch = vi.fn(async (_: unknown, opts?: RequestInit) => {
      capturedHeaders = opts?.headers as Record<string, string> ?? {};
      return new Response(JSON.stringify({ code: 0, data: { list: [] } }), { status: 200 });
    });
    const svc = makeSvc(connDb(tiktokConn), fetch as unknown as FetchFn);
    await svc.listCampaigns("t1", "tiktok");
    expect(capturedHeaders["Access-Token"]).toBe("ttok-abc");
  });
});

// ── TikTok setCampaignStatus ──────────────────────────────────────────────────

describe("TikTok setCampaignStatus", () => {
  it("sends ENABLE for ACTIVE status", async () => {
    let body = "";
    const fetch = vi.fn(async (_, opts?: RequestInit) => {
      body = String(opts?.body ?? "");
      return new Response(JSON.stringify({ code: 0 }), { status: 200 });
    });
    const svc = makeSvc(connDb(tiktokConn), fetch as unknown as FetchFn);
    await svc.setCampaignStatus("t1", "tiktok", "tt-1", "ACTIVE");
    expect(body).toContain('"ENABLE"');
  });

  it("sends DISABLE for PAUSED status", async () => {
    let body = "";
    const fetch = vi.fn(async (_, opts?: RequestInit) => {
      body = String(opts?.body ?? "");
      return new Response(JSON.stringify({ code: 0 }), { status: 200 });
    });
    const svc = makeSvc(connDb(tiktokConn), fetch as unknown as FetchFn);
    await svc.setCampaignStatus("t1", "tiktok", "tt-1", "PAUSED");
    expect(body).toContain('"DISABLE"');
  });
});

// ── TikTok createCampaign ─────────────────────────────────────────────────────

describe("TikTok createCampaign", () => {
  it("creates and returns campaign with correct id and platform", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: 0, data: { campaign_id: "tt-new-1" } }), { status: 200 }),
    );
    const svc = makeSvc(connDb(tiktokConn), fetch as unknown as FetchFn);
    const c = await svc.createCampaign("t1", { platform: "tiktok", name: "Launch", dailyBudgetUsd: 30 });
    expect(c.id).toBe("tt-new-1");
    expect(c.platform).toBe("tiktok");
    expect(c.dailyBudget).toBe(30);
  });

  it("throws API_ERROR on non-zero code from TikTok", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: 40101, message: "Insufficient permission" }), { status: 200 }),
    );
    const svc = makeSvc(connDb(tiktokConn), fetch as unknown as FetchFn);
    await expect(svc.createCampaign("t1", { platform: "tiktok", name: "X", dailyBudgetUsd: 10 }))
      .rejects.toMatchObject({ code: "API_ERROR" });
  });
});

// ── Snapchat listCampaigns ────────────────────────────────────────────────────

describe("Snapchat listCampaigns", () => {
  it("maps Snapchat response to AdsCampaign array", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        campaigns: [
          { campaign: { id: "sc-1", name: "Brand Snap", status: "ACTIVE", daily_budget_micro: 15000000 } },
          { campaign: { id: "sc-2", name: "Retarget", status: "PAUSED", daily_budget_micro: 5000000 } },
        ],
      }), { status: 200 }),
    );
    const svc = makeSvc(connDb(snapConn), fetch as unknown as FetchFn);
    const cs = await svc.listCampaigns("t1", "snapchat");
    expect(cs).toHaveLength(2);
    expect(cs[0].id).toBe("sc-1");
    expect(cs[0].status).toBe("ACTIVE");
    expect(cs[0].dailyBudget).toBeCloseTo(15);
    expect(cs[0].platform).toBe("snapchat");
  });

  it("throws API_ERROR on non-200 HTTP response", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ request_status: "ERROR" }), { status: 401 }),
    );
    const svc = makeSvc(connDb(snapConn), fetch as unknown as FetchFn);
    await expect(svc.listCampaigns("t1", "snapchat")).rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("sends Authorization: Bearer header", async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetch = vi.fn(async (_: unknown, opts?: RequestInit) => {
      capturedHeaders = (opts?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({ campaigns: [] }), { status: 200 });
    });
    const svc = makeSvc(connDb(snapConn), fetch as unknown as FetchFn);
    await svc.listCampaigns("t1", "snapchat");
    expect(capturedHeaders["Authorization"]).toBe("Bearer snap-bearer-xyz");
  });
});

// ── Snapchat createCampaign ───────────────────────────────────────────────────

describe("Snapchat createCampaign", () => {
  it("creates campaign and returns with correct daily budget", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        campaigns: [{ campaign: { id: "sc-new-1" } }],
        request_status: "SUCCESS",
      }), { status: 200 }),
    );
    const svc = makeSvc(connDb(snapConn), fetch as unknown as FetchFn);
    const c = await svc.createCampaign("t1", { platform: "snapchat", name: "Snap Launch", dailyBudgetUsd: 25 });
    expect(c.id).toBe("sc-new-1");
    expect(c.platform).toBe("snapchat");
    expect(c.dailyBudget).toBe(25);
  });

  it("sends daily_budget_micro = dailyBudgetUsd × 1_000_000", async () => {
    let body = "";
    const fetch = vi.fn(async (_, opts?: RequestInit) => {
      body = String(opts?.body ?? "");
      return new Response(JSON.stringify({ campaigns: [{ campaign: { id: "x" } }], request_status: "SUCCESS" }), { status: 200 });
    });
    const svc = makeSvc(connDb(snapConn), fetch as unknown as FetchFn);
    await svc.createCampaign("t1", { platform: "snapchat", name: "T", dailyBudgetUsd: 10 });
    expect(body).toContain('"daily_budget_micro":10000000');
  });
});

// ── Snapchat updateCampaignBudget ─────────────────────────────────────────────

describe("Snapchat updateCampaignBudget", () => {
  it("updates budget and returns correct dailyBudget", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ request_status: "SUCCESS" }), { status: 200 }),
    );
    const svc = makeSvc(connDb(snapConn), fetch as unknown as FetchFn);
    const c = await svc.updateCampaignBudget("t1", "snapchat", "sc-1", 50);
    expect(c.dailyBudget).toBe(50);
    expect(c.platform).toBe("snapchat");
  });
});

// ── Platform routing completeness ─────────────────────────────────────────────

describe("AdsPlatform routing", () => {
  it("snapchat is included in platform validation (connectAccount)", async () => {
    const db: Partial<DbPort> = {
      query: async (sql: string) => {
        if (sql.includes("INSERT INTO saas_ads_connections")) return [{ ...snapConn }] as never;
        return [] as never;
      },
    };
    const svc = makeSvc(db);
    const conn = await svc.connectAccount("t1", {
      platform: "snapchat", accountId: "snap-123", accountName: "Test", accessToken: "tok",
    });
    expect(conn.platform).toBe("snapchat");
  });
});
