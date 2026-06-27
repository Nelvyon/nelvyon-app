/**
 * O24 — OsCompetitorGapService unit tests (mock db + injected ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsCompetitorGapService,
  OsCompetitorGapError,
  normalizeCompetitorDomain,
  computeGapScore,
  deriveGaps,
  recommendPack,
  type GapAgentDataPort,
  type GapPackLaunchPort,
  type CompetitorGap,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

function gapRow(over: Record<string, unknown> = {}) {
  return {
    id: "gap-1", run_key: "k", tenant_id: null, workspace_id: null,
    own_domain: "mybiz.com", competitor_url: "https://rival.com/x", competitor_domain: "rival.com",
    status: "running", gaps: [], gap_score: null, recommended_pack_id: null, recommended_skus: [],
    agent_data: {}, report_html: null, pack_run_id: null, launch_id: null, error_message: null,
    metadata: {}, started_at: "2026-06-01T00:00:00Z", completed_at: null, ...over,
  };
}

function agentPort(over: Partial<GapAgentDataPort> = {}): GapAgentDataPort {
  return {
    fetchKeywordSnapshot: async () => ({ provider: "semrush", keywords: [{ keyword: "kw1", volume: 100, cpc: 1, difficulty: 30 }] }),
    fetchCompetitorSnapshot: async () => ({ provider: "semrush", competitors: [{ domain: "rival.com", organicKeywords: 800, traffic: 9000 }] }),
    ...over,
  };
}
const launchPort: GapPackLaunchPort = { suggestLaunch: async () => ({ launchId: "launch-1", packRunId: null }) };

function svc(db: SaasPostgresPort, agent = agentPort(), launch = launchPort) {
  return new OsCompetitorGapService(db, agent, launch);
}

// ── pure helpers ─────────────────────────────────────────────────────────────────

describe("O24 — helpers", () => {
  it("normalizeDomain strips protocol/www/path", () => {
    expect(normalizeCompetitorDomain("https://www.Rival.com/seo/page")).toBe("rival.com");
  });

  it("computeGapScore weights severities and caps at 100", () => {
    const gaps: CompetitorGap[] = [
      { category: "keyword", severity: "high", title: "", detail: "" },
      { category: "content", severity: "medium", title: "", detail: "" },
    ];
    expect(computeGapScore(gaps)).toBe(40);
    const many: CompetitorGap[] = Array.from({ length: 10 }, () => ({ category: "keyword" as const, severity: "high" as const, title: "", detail: "" }));
    expect(computeGapScore(many)).toBe(100);
  });

  it("deriveGaps flags keyword gap when competitor outranks", () => {
    const gaps = deriveGaps([{ keyword: "a", volume: 1, cpc: 0, difficulty: 0 }], [{ domain: "rival.com", organicKeywords: 800, traffic: 9000 }], "rival.com");
    expect(gaps.some((g) => g.category === "keyword")).toBe(true);
    expect(gaps.some((g) => g.category === "cro")).toBe(true);
  });

  it("deriveGaps high keyword gap when own has zero keywords", () => {
    const gaps = deriveGaps([], [{ domain: "rival.com", organicKeywords: 10, traffic: 100 }], "rival.com");
    expect(gaps.find((g) => g.category === "keyword")?.severity).toBe("high");
  });

  it("recommendPack keyword-heavy → growth pack", () => {
    const gaps: CompetitorGap[] = [{ category: "keyword", severity: "high", title: "", detail: "" }, { category: "content", severity: "high", title: "", detail: "" }];
    expect(recommendPack(gaps)).toBe("local-business-growth");
  });

  it("recommendPack ecommerce when product context", () => {
    const gaps: CompetitorGap[] = [{ category: "keyword", severity: "high", title: "", detail: "" }];
    expect(recommendPack(gaps, { hasProductCategory: true })).toBe("ecommerce-growth");
  });

  it("recommendPack cro-heavy → cro-audit-pack", () => {
    const gaps: CompetitorGap[] = [{ category: "cro", severity: "high", title: "", detail: "" }];
    expect(recommendPack(gaps)).toBe("cro-audit-pack");
  });
});

// ── startRun ─────────────────────────────────────────────────────────────────────

describe("O24 — startRun", () => {
  it("inserts a running row", async () => {
    const db = makeDb(() => [gapRow()]);
    const run = await svc(db).startRun({ ownDomain: "mybiz.com", competitorUrl: "https://rival.com/x" });
    expect(run.status).toBe("running");
    expect(run.competitorDomain).toBe("rival.com");
  });

  it("throws VALIDATION on empty domains", async () => {
    await expect(svc(makeDb(() => [])).startRun({ ownDomain: "", competitorUrl: "" })).rejects.toThrow(OsCompetitorGapError);
  });
});

// ── analyzeRun ───────────────────────────────────────────────────────────────────

describe("O24 — analyzeRun", () => {
  function analyzeDb(extra?: (sql: string) => unknown[] | null) {
    return makeDb((sql) => {
      const e = extra?.(sql);
      if (e) return e;
      if (sql.includes("SELECT * FROM os_competitor_gap_runs WHERE id")) return [gapRow()];
      if (sql.includes("UPDATE os_competitor_gap_runs")) return [gapRow({ status: "completed", gap_score: "55", recommended_pack_id: "local-business-growth", report_html: "<html>r</html>" })];
      return [];
    });
  }

  it("completes with gap_score + recommendation", async () => {
    const run = await svc(analyzeDb()).analyzeRun("gap-1");
    expect(run.status).toBe("completed");
    expect(run.gapScore).toBe(55);
    expect(run.recommendedPackId).toBe("local-business-growth");
  });

  it("agent data throwing → still completes with empty agent_data", async () => {
    const agent = agentPort({ fetchKeywordSnapshot: async () => { throw new Error("semrush down"); } });
    const run = await new OsCompetitorGapService(analyzeDb(), agent, launchPort).analyzeRun("gap-1");
    expect(run.status).toBe("completed");
  });

  it("missing run → NOT_FOUND", async () => {
    const db = makeDb(() => []);
    await expect(svc(db).analyzeRun("nope")).rejects.toThrow(OsCompetitorGapError);
  });
});

// ── buildReportHtml ──────────────────────────────────────────────────────────────

describe("O24 — buildReportHtml", () => {
  it("includes competitor domain + recommended pack", () => {
    const html = svc(makeDb(() => [])).buildReportHtml({
      ownDomain: "mybiz.com", competitorUrl: "https://rival.com", competitorDomain: "rival.com",
      gaps: [{ category: "keyword", severity: "high", title: "Brecha", detail: "d" }],
      gapScore: 55, recommendedPackId: "local-business-growth", recommendedSkus: ["NELVYON-SEO"],
      agentData: { provider: "semrush", competitors: [{ domain: "rival.com", organicKeywords: 800, traffic: 9000 }] },
    });
    expect(html).toContain("rival.com");
    expect(html).toContain("local-business-growth");
    expect(html).toContain("Brecha");
  });
});

// ── launchRecommendedPack ────────────────────────────────────────────────────────

describe("O24 — launchRecommendedPack", () => {
  it("execute → saves launch_id", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("SELECT * FROM os_competitor_gap_runs WHERE id")) return [gapRow({ status: "completed", recommended_pack_id: "local-business-growth" })];
      if (sql.includes("UPDATE os_competitor_gap_runs SET launch_id")) return [gapRow({ status: "completed", recommended_pack_id: "local-business-growth", launch_id: "launch-1" })];
      return [];
    });
    const run = await svc(db).launchRecommendedPack("gap-1", { execute: true });
    expect(run.launchId).toBe("launch-1");
  });

  it("execute:false → no launch, returns run", async () => {
    const db = makeDb(() => [gapRow({ status: "completed", recommended_pack_id: "local-business-growth" })]);
    const run = await svc(db).launchRecommendedPack("gap-1", { execute: false });
    expect(run.launchId).toBeNull();
  });

  it("no recommendation → VALIDATION", async () => {
    const db = makeDb(() => [gapRow({ status: "completed", recommended_pack_id: null })]);
    await expect(svc(db).launchRecommendedPack("gap-1", { execute: true })).rejects.toThrow(OsCompetitorGapError);
  });
});

// ── failRun / list / summary ─────────────────────────────────────────────────────

describe("O24 — failRun / queries", () => {
  it("failRun sets failed", async () => {
    const db = makeDb(() => [gapRow({ status: "failed", error_message: "boom" })]);
    const run = await svc(db).failRun("gap-1", "boom");
    expect(run.status).toBe("failed");
  });

  it("listRuns excludes html", async () => {
    const db = makeDb(() => [gapRow({ report_html: "<html>x</html>" })]);
    const list = await svc(db).listRuns();
    expect(list[0]!.reportHtml).toBeUndefined();
  });

  it("getSummary aggregates avg + top pack", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("COUNT(*) AS total")) return [{ total: "6", completed: "5", avg_score: "48.6" }];
      if (sql.includes("GROUP BY recommended_pack_id")) return [{ recommended_pack_id: "local-business-growth" }];
      return [];
    });
    const s = await svc(db).getSummary();
    expect(s.total).toBe(6);
    expect(s.avgGapScore).toBe(49);
    expect(s.topRecommendedPack).toBe("local-business-growth");
  });
});
