import { describe, it, expect, vi } from "vitest";
import { SaasSocialService } from "../SaasSocialService";

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };
type FetchFn = typeof fetch;

function makeSvc(db: Partial<DbPort>, fetchFn?: FetchFn) {
  return new SaasSocialService(
    db as DbPort,
    fetchFn ?? (async () => new Response("{}", { status: 200 })),
  );
}

// publishPost JOIN row shape (p.* + a.access_token + a.page_id)
function joinRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1", tenant_id: "t1", social_account_id: "acc-1",
    platform: "meta", content: "Hello", media_urls: [], status: "scheduled",
    scheduled_at: new Date(Date.now() - 60000).toISOString(),
    published_at: null, external_post_id: null, error_message: null,
    created_at: new Date(),
    access_token: "tok-valid", page_id: "page-123",
    ...overrides,
  };
}

// ── processDueScheduled ───────────────────────────────────────────────────────

describe("processDueScheduled", () => {
  it("returns zero published/failed when no posts are due", async () => {
    const svc = makeSvc({ query: async () => [] });
    const r = await svc.processDueScheduled();
    expect(r).toEqual({ published: 0, failed: 0 });
  });

  it("publishes one Meta post → published:1 failed:0", async () => {
    const db: Partial<DbPort> = {
      query: async (sql: string) => {
        if (sql.includes("status='scheduled'")) return [{ id: "post-1", tenant_id: "t1" }] as never;
        if (sql.includes("JOIN saas_social_accounts"))
          return [joinRow()] as never;
        return [] as never; // UPDATE
      },
    };
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ id: "ext-1" }), { status: 200 }),
    );
    const svc = makeSvc(db, fetchFn as unknown as FetchFn);
    const r = await svc.processDueScheduled();
    expect(r.published).toBe(1);
    expect(r.failed).toBe(0);
  });

  it("counts failed when Meta API returns error response", async () => {
    const db: Partial<DbPort> = {
      query: async (sql: string) => {
        if (sql.includes("status='scheduled'")) return [{ id: "post-1", tenant_id: "t1" }] as never;
        if (sql.includes("JOIN saas_social_accounts"))
          return [joinRow()] as never;
        return [] as never;
      },
    };
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "token expired" } }), { status: 400 }),
    );
    const svc = makeSvc(db, fetchFn as unknown as FetchFn);
    const r = await svc.processDueScheduled();
    expect(r.failed).toBe(1);
    expect(r.published).toBe(0);
  });

  it("publishes LinkedIn post successfully", async () => {
    const db: Partial<DbPort> = {
      query: async (sql: string) => {
        if (sql.includes("status='scheduled'")) return [{ id: "p2", tenant_id: "t2" }] as never;
        if (sql.includes("JOIN saas_social_accounts"))
          return [joinRow({ id: "p2", tenant_id: "t2", platform: "linkedin", page_id: "urn:li:organization:999" })] as never;
        return [] as never;
      },
    };
    const fetchFn = vi.fn(async () =>
      new Response("{}", { status: 201, headers: { "x-restli-id": "urn:li:ugcPost:123" } }),
    );
    const svc = makeSvc(db, fetchFn as unknown as FetchFn);
    const r = await svc.processDueScheduled();
    expect(r.published).toBe(1);
    expect(r.failed).toBe(0);
  });

  it("Meta fails silently when page_id is null", async () => {
    const db: Partial<DbPort> = {
      query: async (sql: string) => {
        if (sql.includes("status='scheduled'")) return [{ id: "p3", tenant_id: "t3" }] as never;
        if (sql.includes("JOIN saas_social_accounts"))
          return [joinRow({ id: "p3", tenant_id: "t3", page_id: null })] as never;
        return [] as never;
      },
    };
    const svc = makeSvc(db);
    const r = await svc.processDueScheduled();
    expect(r.failed).toBe(1);
    expect(r.published).toBe(0);
  });

  it("queries with scheduled_at <= NOW() and LIMIT 50", async () => {
    let capturedSql = "";
    const svc = makeSvc({ query: async (sql) => { capturedSql = sql; return []; } });
    await svc.processDueScheduled();
    expect(capturedSql).toContain("scheduled_at <= NOW()");
    expect(capturedSql).toContain("LIMIT 50");
  });
});
