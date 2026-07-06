import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SaasSeoService,
  SaasSeoError,
  isSemrushConfigured,
  resetSaasSeoServiceForTests,
} from "../SaasSeoService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-a";

describe("SaasSeoService", () => {
  beforeEach(() => {
    resetSaasSeoServiceForTests();
    delete process.env.SEMRUSH_API_KEY;
    delete process.env.SEO_DOMAIN;
  });

  it("isSemrushConfigured is false without env", () => {
    expect(isSemrushConfigured()).toBe(false);
  });

  it("listTracked returns empty array", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSeoService(db);
    expect(await svc.listTracked(TENANT)).toEqual([]);
  });

  it("addTracked validates empty keyword", async () => {
    const db = makeDb();
    const svc = new SaasSeoService(db);
    await expect(svc.addTracked(TENANT, "  ")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("addTracked inserts keyword", async () => {
    const row = {
      id: "k1",
      tenant_id: TENANT,
      keyword: "seo madrid",
      domain: "example.com",
      position: 0,
      previous_position: null,
      search_volume: 0,
      difficulty: 0,
      cpc: 0,
      url: null,
      last_synced_at: null,
      updated_at: new Date(),
    };
    const db = makeDb([[row]]);
    const svc = new SaasSeoService(db);
    const kw = await svc.addTracked(TENANT, "SEO Madrid", "example.com");
    expect(kw.keyword).toBe("seo madrid");
    expect(kw.source).toBe("tracked");
  });

  it("removeTracked throws NOT_FOUND", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSeoService(db);
    await expect(svc.removeTracked(TENANT, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("mergeKeywords deduplicates by keyword text", () => {
    const db = makeDb();
    const svc = new SaasSeoService(db);
    const tracked = [
      {
        id: "1",
        keyword: "seo",
        position: 5,
        previousPosition: null,
        searchVolume: 100,
        difficulty: 0,
        cpc: 1,
        url: null,
        updatedAt: new Date().toISOString(),
        source: "tracked" as const,
      },
    ];
    const semrush = [
      {
        id: "2",
        keyword: "seo",
        position: 3,
        previousPosition: null,
        searchVolume: 200,
        difficulty: 0,
        cpc: 2,
        url: null,
        updatedAt: new Date().toISOString(),
        source: "semrush" as const,
      },
      {
        id: "3",
        keyword: "marketing",
        position: 10,
        previousPosition: null,
        searchVolume: 50,
        difficulty: 0,
        cpc: 0.5,
        url: null,
        updatedAt: new Date().toISOString(),
        source: "semrush" as const,
      },
    ];
    const merged = svc.mergeKeywords(tracked, semrush);
    expect(merged).toHaveLength(2);
    expect(merged.map((k) => k.keyword)).toEqual(["seo", "marketing"]);
  });

  it("fetchSemrushDomainKeywords returns empty without config", async () => {
    const db = makeDb();
    const svc = new SaasSeoService(db);
    const result = await svc.fetchSemrushDomainKeywords();
    expect(result.keywords).toEqual([]);
    expect(result.error).toBeUndefined();
  });
});

describe("SaasSeoError", () => {
  it("has expected name", () => {
    expect(new SaasSeoError("x", "VALIDATION").name).toBe("SaasSeoError");
  });
});
