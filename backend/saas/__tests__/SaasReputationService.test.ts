import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SaasReputationService, SaasReputationError } from "../SaasReputationService";

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };

const TENANT = "tenant-1";
const REVIEW_ID = "review-uuid-1";
const G_REVIEW_ID = "ChIJ123-user@google-1700000000";

const baseReviewRow = {
  id: REVIEW_ID, tenantId: TENANT, googleReviewId: G_REVIEW_ID,
  authorName: "María García", rating: 4,
  reviewText: "Muy buena atención", reviewTime: "2026-06-01T10:00:00Z",
  replyText: null, replyTime: null, replyStatus: "pending",
  syncedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
};

function makeDb(responses: Record<string, unknown[][]> = {}): DbPort & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    query: async <T>(sql: string, _p?: unknown[]): Promise<T[]> => {
      const key = sql.trim().slice(0, 80);
      calls.push(key);
      for (const [k, rows] of Object.entries(responses)) {
        if (sql.toLowerCase().includes(k.toLowerCase())) return rows as T[];
      }
      return [] as T[];
    },
  };
}

// ── getGbpConfig ──────────────────────────────────────────────────────────────

describe("SaasReputationService.getGbpConfig", () => {
  it("returns placesConfigured=false when env vars missing", () => {
    const svc = new SaasReputationService({ db: makeDb() });
    const cfg = svc.getGbpConfig();
    expect(cfg.placesConfigured).toBe(false);
    expect(cfg.oauthConfigured).toBe(false);
  });

  it("returns placesConfigured=true when both env vars set", () => {
    const orig = { KEY: process.env.GOOGLE_PLACES_API_KEY, PLACE: process.env.GBP_PLACE_ID };
    process.env.GOOGLE_PLACES_API_KEY = "AIza123";
    process.env.GBP_PLACE_ID = "ChIJ123";
    const svc = new SaasReputationService({ db: makeDb() });
    const cfg = svc.getGbpConfig();
    expect(cfg.placesConfigured).toBe(true);
    if (orig.KEY === undefined) delete process.env.GOOGLE_PLACES_API_KEY; else process.env.GOOGLE_PLACES_API_KEY = orig.KEY;
    if (orig.PLACE === undefined) delete process.env.GBP_PLACE_ID; else process.env.GBP_PLACE_ID = orig.PLACE;
  });

  it("returns oauthConfigured=true when GBP_ACCESS_TOKEN, ACCOUNT_ID, LOCATION_ID set", () => {
    process.env.GBP_ACCESS_TOKEN = "ya29.token"; process.env.GBP_ACCOUNT_ID = "acc1"; process.env.GBP_LOCATION_ID = "loc1";
    const svc = new SaasReputationService({ db: makeDb() });
    expect(svc.getGbpConfig().oauthConfigured).toBe(true);
    delete process.env.GBP_ACCESS_TOKEN; delete process.env.GBP_ACCOUNT_ID; delete process.env.GBP_LOCATION_ID;
  });
});

// ── syncGbpReviews ────────────────────────────────────────────────────────────

describe("SaasReputationService.syncGbpReviews", () => {
  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "AIza-test";
    process.env.GBP_PLACE_ID = "ChIJ-test";
  });
  afterEach(() => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GBP_PLACE_ID;
    vi.restoreAllMocks();
  });

  it("returns { synced:0, newNegative:0 } when places not configured", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const svc = new SaasReputationService({ db: makeDb() });
    const result = await svc.syncGbpReviews(TENANT);
    expect(result).toEqual({ synced: 0, newNegative: 0 });
  });

  it("throws EXTERNAL_ERROR when Places API returns non-OK status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response));
    const svc = new SaasReputationService({ db: makeDb() });
    await expect(svc.syncGbpReviews(TENANT)).rejects.toMatchObject({ code: "EXTERNAL_ERROR" });
    vi.unstubAllGlobals();
  });

  it("throws EXTERNAL_ERROR on non-OK Places API response status field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ status: "REQUEST_DENIED", result: {} }),
    } as unknown as Response));
    const svc = new SaasReputationService({ db: makeDb() });
    await expect(svc.syncGbpReviews(TENANT)).rejects.toMatchObject({ code: "EXTERNAL_ERROR" });
    vi.unstubAllGlobals();
  });

  it("upserts reviews and returns synced count", async () => {
    const apiReviews = [
      { author_name: "Ana", rating: 5, text: "Excelente", time: 1700000000 },
      { author_name: "Luis", rating: 4, text: "Bien", time: 1700001000 },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ status: "OK", result: { reviews: apiReviews } }),
    } as unknown as Response));
    let upsertCount = 0;
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id, rating from gbp_reviews")) return [] as T[];
        if (sql.toLowerCase().includes("insert into gbp_reviews")) { upsertCount++; return [] as T[]; }
        return [] as T[];
      },
    };
    const svc = new SaasReputationService({ db });
    const result = await svc.syncGbpReviews(TENANT);
    expect(result.synced).toBe(2);
    expect(upsertCount).toBe(2);
    vi.unstubAllGlobals();
  });

  it("counts new negative reviews (rating ≤ 2) and dispatches workflow trigger", async () => {
    const apiReviews = [
      { author_name: "Bad User", rating: 1, text: "Terrible", time: 1700000000 },
      { author_name: "OK User", rating: 4, text: "Bien", time: 1700001000 },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ status: "OK", result: { reviews: apiReviews } }),
    } as unknown as Response));
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id, rating")) return [] as T[]; // all new
        return [] as T[];
      },
    };
    const dispatched: unknown[] = [];
    const svc = new SaasReputationService({ db });
    const result = await svc.syncGbpReviews(TENANT, async (d) => { dispatched.push(d); });
    expect(result.newNegative).toBe(1);
    expect(dispatched).toHaveLength(1);
    expect((dispatched[0] as Record<string, unknown>).rating).toBe(1);
    vi.unstubAllGlobals();
  });

  it("does not dispatch trigger for existing reviews even if negative", async () => {
    const apiReviews = [{ author_name: "Bad", rating: 2, text: "Malo", time: 1700000000 }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ status: "OK", result: { reviews: apiReviews } }),
    } as unknown as Response));
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id, rating")) return [{ id: "existing", rating: 2 }] as T[]; // already exists
        return [] as T[];
      },
    };
    const dispatched: unknown[] = [];
    const svc = new SaasReputationService({ db });
    const result = await svc.syncGbpReviews(TENANT, async (d) => { dispatched.push(d); });
    expect(result.newNegative).toBe(0);
    expect(dispatched).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});

// ── listReviews ───────────────────────────────────────────────────────────────

describe("SaasReputationService.listReviews", () => {
  it("returns empty array when no reviews", async () => {
    const svc = new SaasReputationService({ db: makeDb() });
    const reviews = await svc.listReviews(TENANT);
    expect(reviews).toEqual([]);
  });

  it("returns mapped reviews", async () => {
    const db = makeDb({ "from gbp_reviews": [baseReviewRow] });
    const svc = new SaasReputationService({ db });
    const reviews = await svc.listReviews(TENANT);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].authorName).toBe("María García");
    expect(reviews[0].rating).toBe(4);
    expect(reviews[0].replyStatus).toBe("pending");
  });

  it("passes rating filter to SQL", async () => {
    let sqlCapture = "";
    const db: DbPort = { query: async <T>(sql: string): Promise<T[]> => { sqlCapture = sql; return [] as T[]; } };
    const svc = new SaasReputationService({ db });
    await svc.listReviews(TENANT, { rating: 1 });
    expect(sqlCapture).toContain("r.rating =");
  });

  it("passes replyStatus filter to SQL", async () => {
    let sqlCapture = "";
    const db: DbPort = { query: async <T>(sql: string): Promise<T[]> => { sqlCapture = sql; return [] as T[]; } };
    const svc = new SaasReputationService({ db });
    await svc.listReviews(TENANT, { replyStatus: "pending" });
    expect(sqlCapture).toContain("r.reply_status =");
  });
});

// ── replyToReview ─────────────────────────────────────────────────────────────

describe("SaasReputationService.replyToReview", () => {
  it("throws VALIDATION when comment is empty", async () => {
    const db = makeDb({ "from gbp_reviews": [baseReviewRow] });
    const svc = new SaasReputationService({ db });
    await expect(svc.replyToReview(TENANT, REVIEW_ID, "")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws NOT_FOUND when review absent (getReview)", async () => {
    const svc = new SaasReputationService({ db: makeDb() });
    await expect(svc.replyToReview(TENANT, REVIEW_ID, "Gracias")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("saves reply locally when OAuth not configured", async () => {
    let updateCalled = false;
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select") && sql.toLowerCase().includes("from gbp_reviews")) return [baseReviewRow] as T[];
        if (sql.toLowerCase().includes("update gbp_reviews")) { updateCalled = true; return [{ ...baseReviewRow, replyText: "Gracias", replyStatus: "replied" }] as T[]; }
        return [] as T[];
      },
    };
    const svc = new SaasReputationService({ db });
    const review = await svc.replyToReview(TENANT, REVIEW_ID, "Gracias por tu reseña");
    expect(updateCalled).toBe(true);
    expect(review.replyStatus).toBe("replied");
  });

  it("calls GBP API when OAuth configured and on HTTP error throws EXTERNAL_ERROR", async () => {
    process.env.GBP_ACCESS_TOKEN = "ya29.token";
    process.env.GBP_ACCOUNT_ID = "acc1";
    process.env.GBP_LOCATION_ID = "loc1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({ error: { message: "Unauthorized" } }),
    } as unknown as Response));
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select") && sql.toLowerCase().includes("from gbp_reviews")) return [baseReviewRow] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasReputationService({ db });
    await expect(svc.replyToReview(TENANT, REVIEW_ID, "Gracias")).rejects.toMatchObject({ code: "EXTERNAL_ERROR" });
    delete process.env.GBP_ACCESS_TOKEN; delete process.env.GBP_ACCOUNT_ID; delete process.env.GBP_LOCATION_ID;
    vi.unstubAllGlobals();
  });
});

// ── markIgnored ───────────────────────────────────────────────────────────────

describe("SaasReputationService.markIgnored", () => {
  it("throws NOT_FOUND when review absent", async () => {
    const svc = new SaasReputationService({ db: makeDb() });
    await expect(svc.markIgnored(TENANT, REVIEW_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("sets reply_status=ignored", async () => {
    const db = makeDb({ "update gbp_reviews": [{ ...baseReviewRow, replyStatus: "ignored" }] });
    const svc = new SaasReputationService({ db });
    const r = await svc.markIgnored(TENANT, REVIEW_ID);
    expect(r.replyStatus).toBe("ignored");
  });
});

// ── getStats ──────────────────────────────────────────────────────────────────

describe("SaasReputationService.getStats", () => {
  it("returns zeros when no reviews", async () => {
    const svc = new SaasReputationService({ db: makeDb({ "count(*) as cnt from gbp_reviews where tenant_id": [{ cnt: "0" }] }) });
    const stats = await svc.getStats(TENANT);
    expect(stats.total).toBe(0);
    expect(stats.avgRating).toBe(0);
  });

  it("calculates avgRating and byRating correctly", async () => {
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("group by rating")) return [{ rating: "5", cnt: "3" }, { rating: "4", cnt: "2" }, { rating: "1", cnt: "1" }] as T[];
        if (sql.toLowerCase().includes("reply_status = 'pending'")) return [{ cnt: "4" }] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasReputationService({ db });
    const stats = await svc.getStats(TENANT);
    expect(stats.total).toBe(6); // 3+2+1
    expect(stats.byRating[5]).toBe(3);
    expect(stats.byRating[1]).toBe(1);
    expect(stats.pendingReplies).toBe(4);
    // avgRating = (5*3 + 4*2 + 1*1) / 6 = (15+8+1)/6 = 24/6 = 4.0
    expect(stats.avgRating).toBe(4);
  });
});

// ── SaasReputationError ───────────────────────────────────────────────────────

describe("SaasReputationError", () => {
  it("has correct name and code", () => {
    const e = new SaasReputationError("not found", "NOT_FOUND");
    expect(e.name).toBe("SaasReputationError");
    expect(e.code).toBe("NOT_FOUND");
    expect(e instanceof Error).toBe(true);
  });
});
