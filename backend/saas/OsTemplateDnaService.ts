/**
 * O26 — OsTemplateDnaService
 * "Template DNA" — fuses GA4 sector CVR (O13), pack-run QA outcomes, and the O20
 * learning rank into a single 0-100 score per seed, so the orchestrator picks the
 * best-converting template per sector instead of always seed index 0.
 *
 * Ports injectable so vitest never hits learning/registry/pack tables; prod lazy.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { SECTOR_IDS } from "../autonomous/sectors/sectorRegistry";

// ── Ports ───────────────────────────────────────────────────────────────────────

export type DnaSeedRegistryRow = {
  id: string;
  sector: string;
  source: "envato" | "synthetic" | "metadata" | null;
  learningRank: number | null;
  learningScore: number | null;
};

export type WeightsPort = { getSectorWeights(): Promise<Record<string, number>> };
export type RegistryPort = { listSeedsBySector(sector: string): Promise<DnaSeedRegistryRow[]> };
export type PackOutcomeAgg = { seedId: string; packRuns: number; avgQa: number | null };
export type PackOutcomesPort = { aggregateBySeed(sector?: string): Promise<PackOutcomeAgg[]> };

// ── Types ───────────────────────────────────────────────────────────────────────

export type DnaScore = {
  id: string;
  sectorId: string;
  seedId: string;
  source: "envato" | "synthetic" | "metadata" | null;
  dnaScore: number;
  cvrComponent: number | null;
  qaComponent: number | null;
  rankComponent: number | null;
  packRuns: number;
  avgQaScore: number | null;
  learningRank: number | null;
  learningScore: number | null;
};

export type DnaSummary = {
  sectorsScored: number;
  seedsScored: number;
  lastComputedAt: string | null;
  topSector: string | null;
  avgDnaScore: number;
};

export type OsTemplateDnaErrorCode = "NOT_FOUND";
export class OsTemplateDnaError extends Error {
  constructor(public readonly code: OsTemplateDnaErrorCode, message: string) {
    super(message);
    this.name = "OsTemplateDnaError";
  }
}

// ── Pure helpers (exported for tests) ────────────────────────────────────────────

/**
 * DNA score 0-100. v1 heuristic:
 *  40% normalized sector CVR (cvr capped at 0.20 = full points),
 *  40% avg QA score (0-100),
 *  20% inverse learning rank (rank 1 → 20pts, rank 10 → 2pts, no rank → 10pts default).
 */
export function computeDnaScore(input: { cvr?: number | null; avgQa?: number | null; learningRank?: number | null; packRuns?: number }): number {
  const cvr = input.cvr ?? 0;
  const cvrPts = Math.max(0, Math.min(1, cvr / 0.2)) * 40;

  // No QA data → neutral 70 baseline so unproven-but-present seeds aren't zeroed.
  const qa = input.avgQa ?? 70;
  const qaPts = Math.max(0, Math.min(100, qa)) / 100 * 40;

  let rankPts: number;
  if (input.learningRank && input.learningRank >= 1) {
    rankPts = Math.max(2, 22 - input.learningRank * 2); // rank1=20, rank10=2
  } else {
    rankPts = 10; // no rank → mid default
  }

  const score = cvrPts + qaPts + rankPts;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

export function buildRankMap(rows: Array<{ seedId: string; dnaScore: number }>): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.dnaScore - a.dnaScore);
  const map = new Map<string, number>();
  sorted.forEach((r, i) => map.set(r.seedId, i + 1));
  return map;
}

export function pickBestSeedIndex(seeds: Array<{ id: string }>, rankMap: Map<string, number>): number {
  if (seeds.length === 0) return 0;
  let bestIdx = 0;
  let bestRank = Infinity;
  seeds.forEach((s, i) => {
    const r = rankMap.get(s.id);
    if (r !== undefined && r < bestRank) { bestRank = r; bestIdx = i; }
  });
  return bestIdx;
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type DnaRow = {
  id: string; sector_id: string; seed_id: string; source: "envato" | "synthetic" | "metadata" | null;
  dna_score: string; cvr_component: string | null; qa_component: string | null; rank_component: number | null;
  pack_runs: number; avg_qa_score: string | null; learning_rank: number | null; learning_score: string | null;
};

function n(v: string | null): number | null { if (v === null) return null; const x = parseFloat(v); return Number.isFinite(x) ? x : null; }

function rowToScore(r: DnaRow): DnaScore {
  return {
    id: r.id, sectorId: r.sector_id, seedId: r.seed_id, source: r.source,
    dnaScore: parseFloat(r.dna_score) || 0, cvrComponent: n(r.cvr_component), qaComponent: n(r.qa_component),
    rankComponent: r.rank_component, packRuns: r.pack_runs, avgQaScore: n(r.avg_qa_score),
    learningRank: r.learning_rank, learningScore: n(r.learning_score),
  };
}

// ── Default ports ────────────────────────────────────────────────────────────────

const defaultWeightsPort: WeightsPort = {
  async getSectorWeights() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getOsLearningService } = require("./OsLearningService") as { getOsLearningService: () => { getSectorWeights(): Promise<Record<string, number>> } };
    return getOsLearningService().getSectorWeights();
  },
};

function defaultRegistryPort(db: SaasPostgresPort): RegistryPort {
  return {
    async listSeedsBySector(sector) {
      try {
        const rows = await db.query<{ id: string; sector: string; source: string | null; learning_rank: number | null; learning_score: string | null }>(
          `SELECT id, sector, source, learning_rank, learning_score
           FROM os_envato_seed_registry WHERE sector = $1 ORDER BY learning_rank NULLS LAST, id ASC`,
          [sector],
        );
        return rows.map((r) => ({
          id: r.id, sector: r.sector,
          source: (r.source as DnaSeedRegistryRow["source"]) ?? "synthetic",
          learningRank: r.learning_rank,
          learningScore: r.learning_score !== null ? parseFloat(r.learning_score) : null,
        }));
      } catch {
        return [];
      }
    },
  };
}

function defaultPackOutcomesPort(db: SaasPostgresPort): PackOutcomesPort {
  return {
    async aggregateBySeed(sector) {
      try {
        // Aggregate pack-run QA by the seed_id recorded in the report.
        const rows = await db.query<{ seed_id: string; pack_runs: string; avg_qa: string | null }>(
          `SELECT report->>'seed_id' AS seed_id,
                  COUNT(*) AS pack_runs,
                  AVG((report->'kpis'->>'avg_qa_score')::numeric) AS avg_qa
           FROM nelvyon_pack_runs
           WHERE status = 'completed' AND report ? 'seed_id'
             ${sector ? "AND report->>'sector' = $1" : ""}
           GROUP BY report->>'seed_id'`,
          sector ? [sector] : [],
        );
        return rows.filter((r) => r.seed_id).map((r) => ({
          seedId: r.seed_id, packRuns: parseInt(r.pack_runs, 10), avgQa: r.avg_qa !== null ? parseFloat(r.avg_qa) : null,
        }));
      } catch {
        return [];
      }
    },
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsTemplateDnaService | null = null;

export function getOsTemplateDnaService(): OsTemplateDnaService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    const db = DbClient.getInstance();
    _instance = new OsTemplateDnaService(db, defaultWeightsPort, defaultRegistryPort(db), defaultPackOutcomesPort(db));
  }
  return _instance;
}

export function resetOsTemplateDnaServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsTemplateDnaService {
  private readonly registry: RegistryPort;
  private readonly outcomes: PackOutcomesPort;

  constructor(
    private readonly db: SaasPostgresPort,
    private readonly weights: WeightsPort = defaultWeightsPort,
    registry?: RegistryPort,
    outcomes?: PackOutcomesPort,
  ) {
    this.registry = registry ?? defaultRegistryPort(db);
    this.outcomes = outcomes ?? defaultPackOutcomesPort(db);
  }

  /** Recompute + persist DNA scores for one sector. Returns top 10. */
  async refreshSector(sectorId: string): Promise<DnaScore[]> {
    const [weights, seeds, packAgg] = await Promise.all([
      this.weights.getSectorWeights().catch(() => ({} as Record<string, number>)),
      this.registry.listSeedsBySector(sectorId),
      this.outcomes.aggregateBySeed(sectorId).catch(() => [] as PackOutcomeAgg[]),
    ]);
    const cvr = weights[sectorId] ?? 0;
    const aggBySeed = new Map(packAgg.map((p) => [p.seedId, p]));

    // Score each registry seed (fallback to a synthetic seed id if registry empty).
    const seedList = seeds.length > 0 ? seeds : [{ id: `${sectorId}_tpl_0`, sector: sectorId, source: "synthetic" as const, learningRank: null, learningScore: null }];

    const scored: DnaScore[] = [];
    for (const seed of seedList) {
      const agg = aggBySeed.get(seed.id);
      const avgQa = agg?.avgQa ?? null;
      const packRuns = agg?.packRuns ?? 0;
      const dnaScore = computeDnaScore({ cvr, avgQa, learningRank: seed.learningRank, packRuns });
      const cvrComponent = Math.round(cvr * 10000) / 10000;
      const qaComponent = avgQa !== null ? Math.round(avgQa * 100) / 100 : null;

      const rows = await this.db.query<DnaRow>(
        `INSERT INTO os_template_dna_scores
           (sector_id, seed_id, source, dna_score, cvr_component, qa_component, rank_component,
            pack_runs, avg_qa_score, learning_rank, learning_score, computed_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW())
         ON CONFLICT (sector_id, seed_id) DO UPDATE SET
           source = EXCLUDED.source, dna_score = EXCLUDED.dna_score, cvr_component = EXCLUDED.cvr_component,
           qa_component = EXCLUDED.qa_component, rank_component = EXCLUDED.rank_component,
           pack_runs = EXCLUDED.pack_runs, avg_qa_score = EXCLUDED.avg_qa_score,
           learning_rank = EXCLUDED.learning_rank, learning_score = EXCLUDED.learning_score, updated_at = NOW()
         RETURNING *`,
        [sectorId, seed.id, seed.source, dnaScore, cvrComponent, qaComponent, seed.learningRank, packRuns, avgQa, seed.learningRank, seed.learningScore],
      );
      scored.push(rowToScore(rows[0]!));
    }

    scored.sort((a, b) => b.dnaScore - a.dnaScore);
    return scored.slice(0, 10);
  }

  /** Refresh all 20 sectors (best-effort, never aborts on one failure). */
  async refreshAll(): Promise<{ sectors: number }> {
    let count = 0;
    for (const sectorId of SECTOR_IDS) {
      try { await this.refreshSector(sectorId); count++; } catch { /* skip sector */ }
    }
    return { sectors: count };
  }

  async getSectorDna(sectorId: string, limit = 20): Promise<DnaScore[]> {
    const rows = await this.db.query<DnaRow>(
      `SELECT * FROM os_template_dna_scores WHERE sector_id = $1 ORDER BY dna_score DESC LIMIT $2`,
      [sectorId, Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map(rowToScore);
  }

  async getTopSeedsAcrossSectors(limit = 50): Promise<DnaScore[]> {
    const rows = await this.db.query<DnaRow>(
      `SELECT * FROM os_template_dna_scores ORDER BY dna_score DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map(rowToScore);
  }

  async getSummary(): Promise<DnaSummary> {
    const rows = await this.db.query<{ sectors: string; seeds: string; avg_score: string | null; last: string | null }>(
      `SELECT COUNT(DISTINCT sector_id) AS sectors, COUNT(*) AS seeds,
              AVG(dna_score) AS avg_score, MAX(computed_at) AS last
       FROM os_template_dna_scores`,
    );
    let topSector: string | null = null;
    try {
      const t = await this.db.query<{ sector_id: string }>(
        `SELECT sector_id FROM os_template_dna_scores GROUP BY sector_id ORDER BY MAX(dna_score) DESC LIMIT 1`,
      );
      topSector = t[0]?.sector_id ?? null;
    } catch { /* ignore */ }
    const r = rows[0];
    return {
      sectorsScored: parseInt(r?.sectors ?? "0", 10),
      seedsScored: parseInt(r?.seeds ?? "0", 10),
      lastComputedAt: r?.last ?? null,
      topSector,
      avgDnaScore: r?.avg_score ? Math.round(parseFloat(r.avg_score) * 100) / 100 : 0,
    };
  }

  /** Rank map (seedId → 1-based rank) for seed-selector / packOrchestrator. */
  async getLearningRankMap(sectorId: string): Promise<Map<string, number>> {
    try {
      const rows = await this.db.query<{ seed_id: string; dna_score: string }>(
        `SELECT seed_id, dna_score FROM os_template_dna_scores WHERE sector_id = $1 ORDER BY dna_score DESC`,
        [sectorId],
      );
      return buildRankMap(rows.map((r) => ({ seedId: r.seed_id, dnaScore: parseFloat(r.dna_score) || 0 })));
    } catch {
      return new Map();
    }
  }
}
