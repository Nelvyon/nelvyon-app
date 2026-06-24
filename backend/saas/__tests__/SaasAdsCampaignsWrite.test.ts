import { describe, it, expect, vi } from "vitest";
import { SaasAdsDashboardService } from "../SaasAdsDashboardService";

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };
type FetchFn = typeof fetch;

function makeSvc(db: Partial<DbPort>, fetchFn?: FetchFn) {
  return new SaasAdsDashboardService(
    db as DbPort,
    fetchFn ?? (async () => new Response("{}", { status: 200 })),
  );
}

const metaConn = {
  id: "c1", tenant_id: "t1", platform: "meta", account_id: "123456",
  account_name: "Test Meta", access_token: "EAAG-test", refresh_token: null,
  token_expires_at: null, extra_config: {}, is_active: true, created_at: new Date(),
};

const googleConn = {
  id: "c2", tenant_id: "t1", platform: "google", account_id: "111-222-333",
  account_name: "Test Google", access_token: "ya29-test", refresh_token: null,
  token_expires_at: null, extra_config: { developerToken: "devtok" }, is_active: true, created_at: new Date(),
};

function connDb(conn: typeof metaConn | typeof googleConn) {
  return { query: async () => [conn] as never };
}

// ── createCampaign — Meta ─────────────────────────────────────────────────────

describe("createCampaign — Meta", () => {
  it("creates campaign and returns AdsCampaign shape", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: "act_999" }), { status: 200 }),
    );
    const svc = makeSvc(connDb(metaConn), fetch as unknown as FetchFn);
    const c = await svc.createCampaign("t1", {
      platform: "meta", name: "Verano 2026", dailyBudgetUsd: 20, objective: "LINK_CLICKS",
    });
    expect(c.platform).toBe("meta");
    expect(c.name).toBe("Verano 2026");
    expect(c.dailyBudget).toBe(20);
    expect(c.id).toBe("act_999");
  });

  it("posts correct daily_budget in cents (USD × 100)", async () => {
    let capturedBody = "";
    const fetch = vi.fn(async (_, opts?: RequestInit) => {
      capturedBody = opts?.body ? String(opts.body) : "";
      return new Response(JSON.stringify({ id: "x" }), { status: 200 });
    });
    const svc = makeSvc(connDb(metaConn), fetch as unknown as FetchFn);
    await svc.createCampaign("t1", { platform: "meta", name: "Test", dailyBudgetUsd: 15.5 });
    expect(capturedBody).toContain('"daily_budget":1550');
  });

  it("throws API_ERROR when Meta returns error payload", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 400 }),
    );
    const svc = makeSvc(connDb(metaConn), fetch as unknown as FetchFn);
    await expect(svc.createCampaign("t1", { platform: "meta", name: "X", dailyBudgetUsd: 5 }))
      .rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("throws NOT_CONNECTED when no active connection", async () => {
    const svc = makeSvc({ query: async () => [] as never });
    await expect(svc.createCampaign("t1", { platform: "meta", name: "X", dailyBudgetUsd: 5 }))
      .rejects.toMatchObject({ code: "NOT_CONNECTED" });
  });
});

// ── createCampaign — Google ───────────────────────────────────────────────────

describe("createCampaign — Google", () => {
  it("creates campaign and extracts id from resourceName", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ results: [{ resourceName: "customers/111222333/campaigns/77" }] }), { status: 200 }),
    );
    const svc = makeSvc(connDb(googleConn), fetch as unknown as FetchFn);
    const c = await svc.createCampaign("t1", { platform: "google", name: "Búsqueda SEM", dailyBudgetUsd: 50 });
    expect(c.platform).toBe("google");
    expect(c.id).toBe("77");
    expect(c.dailyBudget).toBe(50);
  });

  it("sends amountMicros = dailyBudgetUsd × 1_000_000", async () => {
    let capturedBody = "";
    const fetch = vi.fn(async (_, opts?: RequestInit) => {
      capturedBody = opts?.body ? String(opts.body) : "";
      return new Response(JSON.stringify({ results: [{ resourceName: "customers/1/campaigns/1" }] }), { status: 200 });
    });
    const svc = makeSvc(connDb(googleConn), fetch as unknown as FetchFn);
    await svc.createCampaign("t1", { platform: "google", name: "G", dailyBudgetUsd: 30 });
    expect(capturedBody).toContain('"amountMicros":30000000');
  });

  it("throws NOT_CONNECTED for google when no connection", async () => {
    const svc = makeSvc({ query: async () => [] as never });
    await expect(svc.createCampaign("t1", { platform: "google", name: "G", dailyBudgetUsd: 10 }))
      .rejects.toMatchObject({ code: "NOT_CONNECTED" });
  });
});

// ── updateCampaignBudget ──────────────────────────────────────────────────────

describe("updateCampaignBudget", () => {
  it("updates Meta budget and returns campaign with new dailyBudget", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const svc = makeSvc(connDb(metaConn), fetch as unknown as FetchFn);
    const c = await svc.updateCampaignBudget("t1", "meta", "cmp-1", 25);
    expect(c.dailyBudget).toBe(25);
    expect(c.platform).toBe("meta");
  });

  it("updates Google budget and returns campaign", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const svc = makeSvc(connDb(googleConn), fetch as unknown as FetchFn);
    const c = await svc.updateCampaignBudget("t1", "google", "cmp-2", 100);
    expect(c.dailyBudget).toBe(100);
    expect(c.platform).toBe("google");
  });

  it("throws VALIDATION when dailyBudgetUsd <= 0", async () => {
    const svc = makeSvc(connDb(metaConn));
    await expect(svc.updateCampaignBudget("t1", "meta", "x", 0))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws API_ERROR when API returns error body", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "Campaign not found" } }), { status: 404 }),
    );
    const svc = makeSvc(connDb(metaConn), fetch as unknown as FetchFn);
    await expect(svc.updateCampaignBudget("t1", "meta", "bad-id", 10))
      .rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("throws API_ERROR for unsupported platform linkedin", async () => {
    const linkedinConn = { ...metaConn, platform: "linkedin" as const };
    const svc = makeSvc(connDb(linkedinConn));
    await expect(svc.updateCampaignBudget("t1", "linkedin", "x", 10))
      .rejects.toMatchObject({ code: "API_ERROR" });
  });
});
