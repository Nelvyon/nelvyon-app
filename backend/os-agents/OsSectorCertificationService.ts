/**
 * O18 — OsSectorCertificationService
 * Batch-certifies sector OS agents: registry instantiate + intake schema smoke.
 */
import { OS_SECTOR_SERVICE_IDS, instantiateSectorOsAgent, isSectorServiceId } from "./sectorOsRegistry";
import { getSchemaForService } from "./IntakeFormService";

export type SectorCertDbPort = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
};

export type SectorCertification = {
  sectorServiceId: string;
  status: "pending" | "passed" | "failed";
  agentInstantiates: boolean;
  intakeSchemaValid: boolean;
  failureReason: string | null;
  certifiedAt: string | null;
  lastCheckedAt: string;
};

export type SectorCertSummary = { passed: number; failed: number; pending: number; total: number };

const BATCH_SIZE = 25;

export class OsSectorCertificationService {
  constructor(private readonly db: SectorCertDbPort) {}

  private certifyOne(sectorId: string): Omit<SectorCertification, "lastCheckedAt"> {
    if (!isSectorServiceId(sectorId)) {
      return {
        sectorServiceId: sectorId,
        status: "failed",
        agentInstantiates: false,
        intakeSchemaValid: false,
        failureReason: "Unknown sector service id",
        certifiedAt: null,
      };
    }
    try {
      const agent = instantiateSectorOsAgent(sectorId);
      if (!agent) {
        return {
          sectorServiceId: sectorId,
          status: "failed",
          agentInstantiates: false,
          intakeSchemaValid: false,
          failureReason: "instantiateSectorOsAgent returned null",
          certifiedAt: null,
        };
      }
      const schema = getSchemaForService(sectorId);
      const intakeSchemaValid = schema.length > 0;
      const passed = intakeSchemaValid;
      return {
        sectorServiceId: sectorId,
        status: passed ? "passed" : "failed",
        agentInstantiates: true,
        intakeSchemaValid,
        failureReason: passed ? null : "Intake schema missing or empty",
        certifiedAt: passed ? new Date().toISOString() : null,
      };
    } catch (e) {
      return {
        sectorServiceId: sectorId,
        status: "failed",
        agentInstantiates: false,
        intakeSchemaValid: false,
        failureReason: e instanceof Error ? e.message : "certification error",
        certifiedAt: null,
      };
    }
  }

  async upsertCertification(row: Omit<SectorCertification, "lastCheckedAt">): Promise<void> {
    await this.db.query(
      `INSERT INTO os_sector_certifications
         (sector_service_id, status, agent_instantiates, intake_schema_valid, failure_reason, certified_at, last_checked_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (sector_service_id) DO UPDATE SET
         status=EXCLUDED.status,
         agent_instantiates=EXCLUDED.agent_instantiates,
         intake_schema_valid=EXCLUDED.intake_schema_valid,
         failure_reason=EXCLUDED.failure_reason,
         certified_at=EXCLUDED.certified_at,
         last_checked_at=NOW()`,
      [
        row.sectorServiceId,
        row.status,
        row.agentInstantiates,
        row.intakeSchemaValid,
        row.failureReason,
        row.certifiedAt,
      ],
    );
  }

  /** Certify next batch of sectors not yet passed (or stale > 7d). */
  async runBatchCertification(): Promise<{ processed: number; passed: number; failed: number }> {
    const stale = await this.db.query<{ sector_service_id: string }>(
      `SELECT sector_service_id FROM os_sector_certifications
       WHERE status != 'passed' OR last_checked_at < NOW() - INTERVAL '7 days'
       ORDER BY last_checked_at ASC NULLS FIRST
       LIMIT $1`,
      [BATCH_SIZE],
    );
    const staleIds = new Set(stale.map((r) => r.sector_service_id));
    const pending = OS_SECTOR_SERVICE_IDS.filter((id: string) => !staleIds.has(id));
    const toRun = [
      ...stale.map((r) => r.sector_service_id),
      ...pending.slice(0, Math.max(0, BATCH_SIZE - stale.length)),
    ].slice(0, BATCH_SIZE);

    let passed = 0;
    let failed = 0;
    for (const sectorId of toRun) {
      const result = this.certifyOne(sectorId);
      await this.upsertCertification(result);
      if (result.status === "passed") passed++;
      else failed++;
    }
    return { processed: toRun.length, passed, failed };
  }

  async getSummary(): Promise<SectorCertSummary> {
    const rows = await this.db.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM os_sector_certifications GROUP BY status`,
    );
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = Number(r.count);
    const registered = OS_SECTOR_SERVICE_IDS.length;
    const passed = byStatus.passed ?? 0;
    const failed = byStatus.failed ?? 0;
    const pending = Math.max(0, registered - passed - failed);
    return { passed, failed, pending, total: registered };
  }

  async listCertifications(limit = 200): Promise<SectorCertification[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM os_sector_certifications ORDER BY sector_service_id LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      sectorServiceId: String(r.sector_service_id),
      status: String(r.status) as SectorCertification["status"],
      agentInstantiates: Boolean(r.agent_instantiates),
      intakeSchemaValid: Boolean(r.intake_schema_valid),
      failureReason: r.failure_reason != null ? String(r.failure_reason) : null,
      certifiedAt: r.certified_at != null ? String(r.certified_at) : null,
      lastCheckedAt: String(r.last_checked_at),
    }));
  }
}

let _instance: OsSectorCertificationService | null = null;
export function getOsSectorCertificationService(): OsSectorCertificationService {
  if (!_instance) {
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SectorCertDbPort } };
    _instance = new OsSectorCertificationService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsSectorCertificationServiceForTests(): void {
  _instance = null;
}
