/**
 * OsLearningService — GA4-driven learning loop for OS seed-selector.
 *
 * Monthly cron reads GA4 conversion + session data per pagePath,
 * maps page paths to OS sectors, computes CVR, and upserts os_seed_weights.
 *
 * Weights are later used by getTopSectorsByCvr() in seed-selector.ts
 * to prioritise which sectors get more thorough seed coverage.
 */
import { DbClient } from "../db/DbClient";
import { getGA4Service, type GoogleAnalytics4Service } from "../integrations/GoogleAnalytics4Service";
import { SECTOR_IDS } from "../autonomous/sectors/sectorRegistry";

// Sectors OS supports — sourced from the 20-sector registry (O16) so the learning
// loop stays aligned with sector readiness + seeds. pathToSector() keeps the
// legacy synonyms below for GA4 paths that don't match a registry id directly.
const KNOWN_SECTORS: readonly string[] = SECTOR_IDS;

export type OsSector = string;

export type SectorWeight = {
  sector: string;
  cvr: number;
  sessions: number;
  conversions: number;
  updatedAt: string;
};

export type LearningResult = {
  processedSectors: number;
  totalSessions: number;
  totalConversions: number;
  weights: Record<string, number>;
  runAt: string;
};

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };

// Maps a GA4 pagePath to the closest OS sector, or null if no match.
function pathToSector(pagePath: string): string | null {
  const lower = pagePath.toLowerCase();
  for (const sector of KNOWN_SECTORS) {
    if (lower.includes(sector)) return sector;
  }
  // Common Spanish synonyms
  if (lower.includes("dentist")) return "dental";
  if (lower.includes("restaurante") || lower.includes("comida")) return "restaurant";
  if (lower.includes("tienda") || lower.includes("shop")) return "ecommerce";
  if (lower.includes("clinica") || lower.includes("medico") || lower.includes("clinic")) return "clinica";
  if (lower.includes("hotel") || lower.includes("alojamiento")) return "hosteleria";
  if (lower.includes("abogado") || lower.includes("lawyer")) return "legal";
  if (lower.includes("academia") || lower.includes("curso") || lower.includes("school")) return "educacion";
  return null;
}

export class OsLearningService {
  constructor(
    private readonly db: DbPort,
    private readonly ga4: GoogleAnalytics4Service,
  ) {}

  /**
   * Fetches GA4 data for the given userId, computes CVR per OS sector,
   * and upserts into os_seed_weights.
   */
  async runLearningLoop(ga4UserId: string): Promise<LearningResult> {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    const dateRange = { startDate, endDate };

    // Fetch page-level sessions + conversions from GA4
    const rows = await this.ga4.runReport(
      ga4UserId,
      dateRange,
      ["pagePath"],
      ["sessions", "conversions"],
    );

    // Aggregate by sector
    const bySector: Record<string, { sessions: number; conversions: number }> = {};
    for (const row of rows) {
      const pagePath = row.dimensions.pagePath ?? "";
      const sector = pathToSector(pagePath);
      if (!sector) continue;
      if (!bySector[sector]) bySector[sector] = { sessions: 0, conversions: 0 };
      bySector[sector].sessions += Math.round(Number(row.metrics.sessions ?? 0));
      bySector[sector].conversions += Math.round(Number(row.metrics.conversions ?? 0));
    }

    const weights: Record<string, number> = {};
    let totalSessions = 0;
    let totalConversions = 0;

    for (const [sector, data] of Object.entries(bySector)) {
      const cvr = data.sessions > 0 ? data.conversions / data.sessions : 0;
      weights[sector] = cvr;
      totalSessions += data.sessions;
      totalConversions += data.conversions;

      await this.db.query(
        `INSERT INTO os_seed_weights (sector, cvr, sessions, conversions, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (sector) DO UPDATE SET
           cvr = EXCLUDED.cvr,
           sessions = EXCLUDED.sessions,
           conversions = EXCLUDED.conversions,
           updated_at = NOW()`,
        [sector, cvr, data.sessions, data.conversions],
      );
    }

    return {
      processedSectors: Object.keys(bySector).length,
      totalSessions,
      totalConversions,
      weights,
      runAt: new Date().toISOString(),
    };
  }

  /** Returns all stored CVR weights keyed by sector. */
  async getSectorWeights(): Promise<Record<string, number>> {
    const rows = await this.db.query<{ sector: string; cvr: number }>(
      `SELECT sector, cvr FROM os_seed_weights ORDER BY cvr DESC`,
    );
    const out: Record<string, number> = {};
    for (const r of rows) out[r.sector] = Number(r.cvr);
    return out;
  }

  /** Returns the top-N sectors sorted by CVR descending. */
  async getTopSectors(n = 5): Promise<SectorWeight[]> {
    const rows = await this.db.query<{ sector: string; cvr: number; sessions: number; conversions: number; updated_at: string }>(
      `SELECT sector, cvr, sessions, conversions, updated_at FROM os_seed_weights ORDER BY cvr DESC LIMIT $1`,
      [n],
    );
    return rows.map((r) => ({
      sector: r.sector,
      cvr: Number(r.cvr),
      sessions: Number(r.sessions),
      conversions: Number(r.conversions),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }
}

let _instance: OsLearningService | null = null;
export function getOsLearningService(): OsLearningService {
  if (!_instance) _instance = new OsLearningService(DbClient.getInstance(), getGA4Service());
  return _instance;
}
export function resetOsLearningServiceForTests(): void { _instance = null; }
