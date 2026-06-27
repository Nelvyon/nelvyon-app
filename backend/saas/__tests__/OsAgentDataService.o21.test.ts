/**
 * O21 — OsAgentDataService unit tests (mock db + injected ports)
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  OsAgentDataService,
  type SemrushPort,
  type DataForSeoPort,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

const NO_DATA = makeDb(() => []);

function semrushPort(over: Partial<SemrushPort> = {}): SemrushPort {
  return {
    getTopKeywords: async () => [{ keyword: "dentista madrid", searchVolume: 1000, cpc: 2.5, competition: 0.6 }],
    getCompetitors: async () => [{ domain: "rival.com", organicKeywords: 500, traffic: 2000 }],
    ...over,
  };
}

function dfsPort(configured: boolean, over: Partial<DataForSeoPort> = {}): DataForSeoPort {
  return {
    isConfigured: () => configured,
    fetchDomainKeywords: async () => ({ keywords: [{ keyword: "dfs kw", volume: 300, cpc: 1.2, difficulty: 40 }], source: "dataforseo" }),
    ...over,
  };
}

afterEach(() => { delete process.env.SEMRUSH_API_KEY; });

// ── cacheKey ─────────────────────────────────────────────────────────────────────

describe("OsAgentDataService — cacheKey", () => {
  const svc = new OsAgentDataService(NO_DATA, semrushPort(), dfsPort(false));
  it("normalizes domain + database", () => {
    expect(svc.cacheKey("https://www.Example.com/path", "ES")).toBe("example.com:es");
  });
  it("defaults database to es", () => {
    expect(svc.cacheKey("Foo.com")).toBe("foo.com:es");
  });
});

// ── resolveProvider ──────────────────────────────────────────────────────────────

describe("OsAgentDataService — resolveProvider", () => {
  it("semrush when integration active", async () => {
    const db = makeDb((sql) => (sql.includes("FROM integration_semrush") ? [{ active: true }] : []));
    const svc = new OsAgentDataService(db, semrushPort(), dfsPort(false));
    expect(await svc.resolveProvider("u1")).toBe("semrush");
  });

  it("semrush via env when no integration", async () => {
    process.env.SEMRUSH_API_KEY = "k";
    const svc = new OsAgentDataService(NO_DATA, semrushPort(), dfsPort(false));
    expect(await svc.resolveProvider("u1")).toBe("semrush");
  });

  it("dataforseo when configured and no semrush", async () => {
    const svc = new OsAgentDataService(NO_DATA, semrushPort(), dfsPort(true));
    expect(await svc.resolveProvider("u1")).toBe("dataforseo");
  });

  it("none when nothing configured", async () => {
    const svc = new OsAgentDataService(NO_DATA, semrushPort(), dfsPort(false));
    expect(await svc.resolveProvider("u1")).toBe("none");
  });
});

// ── getCached ────────────────────────────────────────────────────────────────────

describe("OsAgentDataService — getCached", () => {
  it("returns payload on hit", async () => {
    const db = makeDb((sql) => (sql.includes("FROM os_agent_data_cache") ? [{ payload: { keywords: [{ keyword: "x" }] }, expires_at: "", provider: "semrush" }] : []));
    const svc = new OsAgentDataService(db, semrushPort(), dfsPort(false));
    const cached = await svc.getCached("foo.com:es", "keywords");
    expect(cached).not.toBeNull();
  });

  it("returns null on miss (expired filtered by SQL)", async () => {
    const svc = new OsAgentDataService(NO_DATA, semrushPort(), dfsPort(false));
    expect(await svc.getCached("foo.com:es", "keywords")).toBeNull();
  });
});

// ── upsertCache ──────────────────────────────────────────────────────────────────

describe("OsAgentDataService — upsertCache", () => {
  it("uses ON CONFLICT upsert", async () => {
    const db = makeDb(() => []) as SaasPostgresPort & { query: ReturnType<typeof vi.fn> };
    const svc = new OsAgentDataService(db, semrushPort(), dfsPort(false));
    await svc.upsertCache({ provider: "semrush", queryType: "keywords", queryKey: "foo.com:es", domain: "foo.com", database: "es", payload: {} });
    const sql = (db.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("os_agent_data_cache");
  });
});

// ── fetchKeywordSnapshot ─────────────────────────────────────────────────────────

describe("OsAgentDataService — fetchKeywordSnapshot", () => {
  it("cache hit → no API call", async () => {
    const sem = semrushPort({ getTopKeywords: vi.fn() as unknown as SemrushPort["getTopKeywords"] });
    const db = makeDb((sql) =>
      sql.includes("FROM os_agent_data_cache")
        ? [{ payload: { provider: "semrush", keywords: [{ keyword: "cached kw", volume: 1, cpc: 0, difficulty: 0 }], fetchedAt: "2026-06-01" }, expires_at: "", provider: "semrush" }]
        : [],
    );
    const svc = new OsAgentDataService(db, sem, dfsPort(false));
    const snap = await svc.fetchKeywordSnapshot({ userId: "u1", domain: "foo.com" });
    expect(snap.cached).toBe(true);
    expect(snap.keywords[0]!.keyword).toBe("cached kw");
    expect(sem.getTopKeywords).not.toHaveBeenCalled();
  });

  it("semrush miss → API → cache write", async () => {
    const writes: string[] = [];
    const db = makeDb((sql) => {
      if (sql.includes("FROM os_agent_data_cache")) return []; // miss
      if (sql.includes("FROM integration_semrush")) return [{ active: true }];
      if (sql.includes("INSERT INTO os_agent_data_cache")) { writes.push(sql); return []; }
      return [];
    });
    const svc = new OsAgentDataService(db, semrushPort(), dfsPort(false));
    const snap = await svc.fetchKeywordSnapshot({ userId: "u1", domain: "foo.com" });
    expect(snap.provider).toBe("semrush");
    expect(snap.cached).toBe(false);
    expect(snap.keywords).toHaveLength(1);
    expect(writes.length).toBe(1);
  });

  it("no provider → empty mock, no throw", async () => {
    const svc = new OsAgentDataService(NO_DATA, semrushPort(), dfsPort(false));
    const snap = await svc.fetchKeywordSnapshot({ userId: "u1", domain: "foo.com" });
    expect(snap.configured).toBe(false);
    expect(snap.provider).toBe("none");
    expect(snap.keywords).toEqual([]);
  });

  it("empty domain → reason no_domain", async () => {
    const svc = new OsAgentDataService(NO_DATA, semrushPort(), dfsPort(false));
    const snap = await svc.fetchKeywordSnapshot({ userId: "u1", domain: "" });
    expect(snap.reason).toBe("no_domain");
  });

  it("semrush fails → dataforseo fallback", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM os_agent_data_cache")) return [];
      if (sql.includes("FROM integration_semrush")) return [{ active: true }];
      return [];
    });
    const sem = semrushPort({ getTopKeywords: async () => { throw new Error("semrush 500"); } });
    const svc = new OsAgentDataService(db, sem, dfsPort(true));
    const snap = await svc.fetchKeywordSnapshot({ userId: "u1", domain: "foo.com" });
    expect(snap.provider).toBe("dataforseo");
    expect(snap.keywords[0]!.keyword).toBe("dfs kw");
  });
});

// ── fetchCompetitorSnapshot ──────────────────────────────────────────────────────

describe("OsAgentDataService — fetchCompetitorSnapshot", () => {
  it("semrush happy path", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("FROM os_agent_data_cache")) return [];
      if (sql.includes("FROM integration_semrush")) return [{ active: true }];
      return [];
    });
    const svc = new OsAgentDataService(db, semrushPort(), dfsPort(false));
    const snap = await svc.fetchCompetitorSnapshot({ userId: "u1", domain: "foo.com" });
    expect(snap.provider).toBe("semrush");
    expect(snap.competitors[0]!.domain).toBe("rival.com");
  });

  it("no provider → empty", async () => {
    const svc = new OsAgentDataService(NO_DATA, semrushPort(), dfsPort(false));
    const snap = await svc.fetchCompetitorSnapshot({ userId: "u1", domain: "foo.com" });
    expect(snap.competitors).toEqual([]);
  });
});

// ── getSummary / listRecent ──────────────────────────────────────────────────────

describe("OsAgentDataService — summary/recent", () => {
  it("getSummary aggregates counts", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("COUNT(*) AS total")) return [{ total: "12", recent: "3" }];
      if (sql.includes("GROUP BY domain")) return [{ domain: "foo.com", count: "5" }];
      if (sql.includes("FROM integration_semrush")) return [{ count: "2" }];
      return [];
    });
    const svc = new OsAgentDataService(db, semrushPort(), dfsPort(true));
    const s = await svc.getSummary();
    expect(s.totalCached).toBe(12);
    expect(s.fetches24h).toBe(3);
    expect(s.semrushIntegrations).toBe(2);
    expect(s.dataforseoConfigured).toBe(true);
    expect(s.topDomains[0]!.domain).toBe("foo.com");
  });

  it("listRecent maps keyword counts + expiry", async () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const db = makeDb(() => [
      { id: "c1", domain: "foo.com", provider: "semrush", query_type: "keywords", payload: { keywords: [{}, {}] }, fetched_at: "", expires_at: future },
    ]);
    const svc = new OsAgentDataService(db, semrushPort(), dfsPort(false));
    const recent = await svc.listRecent();
    expect(recent[0]!.keywordCount).toBe(2);
    expect(recent[0]!.expired).toBe(false);
  });
});
