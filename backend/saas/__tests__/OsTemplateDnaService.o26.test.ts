/**
 * O26 — OsTemplateDnaService unit tests (mock db + injected ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsTemplateDnaService,
  computeDnaScore,
  buildRankMap,
  pickBestSeedIndex,
  type DnaWeightsPort,
  type DnaRegistryPort,
  type DnaPackOutcomesPort,
} from "@nelvyon/saas";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)),
  } as unknown as SaasPostgresPort;
}

function dnaRow(over: Record<string, unknown> = {}) {
  return {
    id: "d1", sector_id: "dental", seed_id: "dental_tpl_0", source: "synthetic",
    dna_score: "82.5", cvr_component: "0.08", qa_component: "90", rank_component: 1,
    pack_runs: 4, avg_qa_score: "90", learning_rank: 1, learning_score: "0.08", ...over,
  };
}

function weightsPort(w: Record<string, number> = { dental: 0.1 }): DnaWeightsPort {
  return { getSectorWeights: async () => w };
}
function registryPort(seeds: Array<{ id: string; sector: string; source: "envato" | "synthetic" | "metadata" | null; learningRank: number | null; learningScore: number | null }>): DnaRegistryPort {
  return { listSeedsBySector: async () => seeds };
}
function outcomesPort(items: Array<{ seedId: string; packRuns: number; avgQa: number | null }> = []): DnaPackOutcomesPort {
  return { aggregateBySeed: async () => items };
}

// ── computeDnaScore ──────────────────────────────────────────────────────────────

describe("O26 — computeDnaScore", () => {
  it("high CVR + high QA + rank 1 → near 100", () => {
    const s = computeDnaScore({ cvr: 0.2, avgQa: 100, learningRank: 1 });
    expect(s).toBe(100); // 40 + 40 + 20
  });

  it("no data → mid default (cvr 0, qa baseline 70, no rank)", () => {
    const s = computeDnaScore({});
    // 0 + (70/100*40)=28 + 10 = 38
    expect(s).toBe(38);
  });

  it("rank 10 gives min rank points", () => {
    const s = computeDnaScore({ cvr: 0, avgQa: 0, learningRank: 10 });
    expect(s).toBe(2);
  });

  it("caps at 100 and floors at 0", () => {
    expect(computeDnaScore({ cvr: 1, avgQa: 100, learningRank: 1 })).toBe(100);
    expect(computeDnaScore({ cvr: 0, avgQa: 0, learningRank: 99 })).toBe(2);
  });
});

// ── buildRankMap / pickBestSeedIndex ─────────────────────────────────────────────

describe("O26 — rank helpers", () => {
  it("buildRankMap orders by dna desc", () => {
    const m = buildRankMap([{ seedId: "a", dnaScore: 50 }, { seedId: "b", dnaScore: 90 }, { seedId: "c", dnaScore: 70 }]);
    expect(m.get("b")).toBe(1);
    expect(m.get("c")).toBe(2);
    expect(m.get("a")).toBe(3);
  });

  it("pickBestSeedIndex returns index of top-ranked seed present", () => {
    const map = new Map([["x", 3], ["y", 1], ["z", 2]]);
    const idx = pickBestSeedIndex([{ id: "x" }, { id: "y" }, { id: "z" }], map);
    expect(idx).toBe(1); // y rank 1
  });

  it("pickBestSeedIndex falls back to 0 when none ranked", () => {
    expect(pickBestSeedIndex([{ id: "a" }, { id: "b" }], new Map())).toBe(0);
  });
});

// ── refreshSector ────────────────────────────────────────────────────────────────

describe("O26 — refreshSector", () => {
  function refreshDb(extra?: (sql: string, params: unknown[]) => unknown[] | null) {
    return makeDb((sql, params) => {
      const e = extra?.(sql, params);
      if (e) return e;
      if (sql.includes("INSERT INTO os_template_dna_scores")) {
        const p = params as unknown[];
        return [dnaRow({ sector_id: p[0], seed_id: p[1], source: p[2], dna_score: String(p[3]), pack_runs: p[7], avg_qa_score: p[8] })];
      }
      return [];
    });
  }

  it("scores registry seeds + UPSERT idempotent", async () => {
    const svc = new OsTemplateDnaService(
      refreshDb(),
      weightsPort({ dental: 0.1 }),
      registryPort([
        { id: "dental_tpl_0", sector: "dental", source: "envato", learningRank: 1, learningScore: 0.1 },
        { id: "dental_tpl_1", sector: "dental", source: "synthetic", learningRank: 2, learningScore: 0.05 },
      ]),
      outcomesPort([{ seedId: "dental_tpl_0", packRuns: 4, avgQa: 90 }]),
    );
    const top = await svc.refreshSector("dental");
    expect(top.length).toBe(2);
    expect(top[0]!.seedId).toBeDefined();
  });

  it("uses ON CONFLICT", async () => {
    const sqls: string[] = [];
    const svc = new OsTemplateDnaService(
      refreshDb((sql) => { sqls.push(sql); return null; }),
      weightsPort(), registryPort([{ id: "s", sector: "dental", source: "synthetic", learningRank: null, learningScore: null }]), outcomesPort(),
    );
    await svc.refreshSector("dental");
    expect(sqls.some((x) => x.includes("ON CONFLICT (sector_id, seed_id)"))).toBe(true);
  });

  it("falls back to synthetic tpl_0 when registry empty", async () => {
    const inserted: unknown[][] = [];
    const db = makeDb((sql, params) => {
      if (sql.includes("INSERT INTO os_template_dna_scores")) { inserted.push(params as unknown[]); return [dnaRow({ seed_id: (params as unknown[])[1] })]; }
      return [];
    });
    const svc = new OsTemplateDnaService(db, weightsPort(), registryPort([]), outcomesPort());
    await svc.refreshSector("dental");
    expect(inserted[0]![1]).toBe("dental_tpl_0");
  });

  it("empty pack outcomes → qa_component null but still scores", async () => {
    const db = makeDb((sql, params) => {
      if (sql.includes("INSERT INTO os_template_dna_scores")) return [dnaRow({ qa_component: null, avg_qa_score: null, seed_id: (params as unknown[])[1] })];
      return [];
    });
    const svc = new OsTemplateDnaService(db, weightsPort(), registryPort([{ id: "s", sector: "dental", source: "synthetic", learningRank: null, learningScore: null }]), outcomesPort([]));
    const top = await svc.refreshSector("dental");
    expect(top[0]!.qaComponent).toBeNull();
    expect(top[0]!.dnaScore).toBeGreaterThan(0);
  });
});

// ── refreshAll ───────────────────────────────────────────────────────────────────

describe("O26 — refreshAll", () => {
  it("scores 20 sectors best-effort", async () => {
    const db = makeDb((sql, params) => (sql.includes("INSERT") ? [dnaRow({ seed_id: (params as unknown[])[1] })] : []));
    const svc = new OsTemplateDnaService(db, weightsPort({}), registryPort([{ id: "s", sector: "x", source: "synthetic", learningRank: null, learningScore: null }]), outcomesPort());
    const r = await svc.refreshAll();
    expect(r.sectors).toBe(20);
  });
});

// ── getLearningRankMap / getSectorDna / getSummary ───────────────────────────────

describe("O26 — queries", () => {
  it("getLearningRankMap → rank 1 for top dna seed", async () => {
    const db = makeDb(() => [{ seed_id: "best", dna_score: "90" }, { seed_id: "second", dna_score: "70" }]);
    const map = await new OsTemplateDnaService(db, weightsPort(), registryPort([]), outcomesPort()).getLearningRankMap("dental");
    expect(map.get("best")).toBe(1);
    expect(map.get("second")).toBe(2);
  });

  it("getLearningRankMap returns empty map on error", async () => {
    const db = makeDb(() => { throw new Error("no table"); });
    const map = await new OsTemplateDnaService(db, weightsPort(), registryPort([]), outcomesPort()).getLearningRankMap("dental");
    expect(map.size).toBe(0);
  });

  it("getSectorDna ORDER DESC mapped", async () => {
    const db = makeDb(() => [dnaRow(), dnaRow({ seed_id: "s2", dna_score: "60" })]);
    const list = await new OsTemplateDnaService(db, weightsPort(), registryPort([]), outcomesPort()).getSectorDna("dental");
    expect(list).toHaveLength(2);
    expect(list[0]!.dnaScore).toBe(82.5);
  });

  it("getSummary counts sectors + seeds + avg", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("COUNT(DISTINCT sector_id)")) return [{ sectors: "5", seeds: "40", avg_score: "66.66", last: "2026-06-01T00:00:00Z" }];
      if (sql.includes("GROUP BY sector_id")) return [{ sector_id: "dental" }];
      return [];
    });
    const s = await new OsTemplateDnaService(db, weightsPort(), registryPort([]), outcomesPort()).getSummary();
    expect(s.sectorsScored).toBe(5);
    expect(s.seedsScored).toBe(40);
    expect(s.avgDnaScore).toBe(66.66);
    expect(s.topSector).toBe("dental");
  });
});
