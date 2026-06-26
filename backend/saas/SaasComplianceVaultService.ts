/**
 * S50 — SaasComplianceVaultService
 * Legal/consent/QA artifacts per deliverable, SaaS tenant-scoped.
 */
import { createHash } from "crypto";
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComplianceStatus = "pending" | "verified" | "expired" | "revoked";
export type ConsentType =
  | "gdpr_marketing"
  | "gdpr_data_processing"
  | "sector_disclaimer"
  | "client_approval"
  | "qa_certificate"
  | "other";
export type DeliverableSourceCV = "os" | "recurring" | "pack_run";

export type ComplianceArtifact = {
  id: string;
  tenantId: string;
  deliverableSource: DeliverableSourceCV;
  deliverableRef: string;
  packRunId: string | null;
  packId: string | null;
  title: string | null;
  consentType: ConsentType;
  legalDocUrl: string | null;
  qaPdfUrl: string | null;
  contentHash: string | null;
  status: ComplianceStatus;
  metadata: Record<string, unknown>;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  expiresAt: string | null;
};

export type VaultSummary = {
  total: number;
  pending: number;
  verified: number;
  expiringSoon: number;
};

export type ListVaultFilters = {
  status?: ComplianceStatus;
  consentType?: ConsentType;
  packId?: string;
  days?: number;
};

export type AttachDocumentInput = {
  legalDocUrl?: string;
  qaPdfUrl?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
};

export type SaasComplianceVaultErrorCode =
  | "NOT_FOUND"
  | "VALIDATION"
  | "ALREADY_VERIFIED";

export class SaasComplianceVaultError extends Error {
  constructor(
    public readonly code: SaasComplianceVaultErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SaasComplianceVaultError";
  }
}

// ── Row type ──────────────────────────────────────────────────────────────────

type VaultRow = {
  id: string;
  tenant_id: string;
  deliverable_source: DeliverableSourceCV;
  deliverable_ref: string;
  pack_run_id: string | null;
  pack_id: string | null;
  title: string | null;
  consent_type: ConsentType;
  legal_doc_url: string | null;
  qa_pdf_url: string | null;
  content_hash: string | null;
  status: ComplianceStatus;
  metadata: Record<string, unknown>;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  expires_at: string | null;
};

function rowToArtifact(r: VaultRow): ComplianceArtifact {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    deliverableSource: r.deliverable_source,
    deliverableRef: r.deliverable_ref,
    packRunId: r.pack_run_id,
    packId: r.pack_id,
    title: r.title,
    consentType: r.consent_type,
    legalDocUrl: r.legal_doc_url,
    qaPdfUrl: r.qa_pdf_url,
    contentHash: r.content_hash,
    status: r.status,
    metadata: r.metadata ?? {},
    verifiedBy: r.verified_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    verifiedAt: r.verified_at,
    expiresAt: r.expires_at,
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: SaasComplianceVaultService | null = null;

export function getSaasComplianceVaultService(): SaasComplianceVaultService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as {
      DbClient: { getInstance(): SaasPostgresPort };
    };
    _instance = new SaasComplianceVaultService(DbClient.getInstance());
  }
  return _instance;
}

export function resetSaasComplianceVaultServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasComplianceVaultService {
  constructor(private readonly db: SaasPostgresPort) {}

  /** SHA-256 of payload string. */
  computeContentHash(payload: string): string {
    return createHash("sha256").update(payload).digest("hex");
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  async getVaultSummary(tenantId: string): Promise<VaultSummary> {
    const rows = await this.db.query<{
      status: ComplianceStatus;
      count: string;
      expiring_count: string;
    }>(
      `SELECT
         status,
         COUNT(*) AS count,
         COUNT(*) FILTER (
           WHERE expires_at IS NOT NULL
             AND expires_at < NOW() + INTERVAL '30 days'
             AND status NOT IN ('expired','revoked')
         ) AS expiring_count
       FROM saas_compliance_vault
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId],
    );

    let total = 0;
    let pending = 0;
    let verified = 0;
    let expiringSoon = 0;

    for (const r of rows) {
      const n = parseInt(r.count, 10);
      total += n;
      if (r.status === "pending") pending += n;
      if (r.status === "verified") verified += n;
      expiringSoon += parseInt(r.expiring_count, 10);
    }

    return { total, pending, verified, expiringSoon };
  }

  // ── List / Get ────────────────────────────────────────────────────────────

  async listArtifacts(
    tenantId: string,
    filters?: ListVaultFilters,
  ): Promise<ComplianceArtifact[]> {
    const conditions: string[] = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters?.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters?.consentType) {
      conditions.push(`consent_type = $${idx++}`);
      params.push(filters.consentType);
    }
    if (filters?.packId) {
      conditions.push(`pack_id = $${idx++}`);
      params.push(filters.packId);
    }
    if (filters?.days) {
      conditions.push(`created_at >= NOW() - ($${idx++} || ' days')::INTERVAL`);
      params.push(String(filters.days));
    }

    const rows = await this.db.query<VaultRow>(
      `SELECT * FROM saas_compliance_vault
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT 50`,
      params,
    );
    return rows.map(rowToArtifact);
  }

  async getArtifact(tenantId: string, artifactId: string): Promise<ComplianceArtifact> {
    const rows = await this.db.query<VaultRow>(
      `SELECT * FROM saas_compliance_vault WHERE id = $1 AND tenant_id = $2`,
      [artifactId, tenantId],
    );
    const row = rows[0];
    if (!row) {
      throw new SaasComplianceVaultError("NOT_FOUND", `Artifact ${artifactId} no encontrado`);
    }
    return rowToArtifact(row);
  }

  // ── Sync from pack run ────────────────────────────────────────────────────

  async syncFromPackRun(
    tenantId: string,
    packRunId: string,
  ): Promise<ComplianceArtifact> {
    const runRows = await this.db.query<{
      id: string;
      pack_id: string;
      report: Record<string, unknown> | null;
    }>(
      `SELECT id, pack_id, report FROM nelvyon_pack_runs WHERE id = $1`,
      [packRunId],
    );
    const run = runRows[0];
    if (!run) {
      throw new SaasComplianceVaultError("NOT_FOUND", `PackRun ${packRunId} no encontrado`);
    }

    const report = run.report ?? {};
    const qaScore = (report as { qaScore?: number }).qaScore ?? null;
    const legalPassed = (report as { legalPassed?: boolean }).legalPassed ?? null;
    const reportUrl = (report as { reportUrl?: string }).reportUrl ?? null;

    const hash = this.computeContentHash(
      `${packRunId}:${qaScore ?? ""}:${String(legalPassed ?? "")}`,
    );

    const metadata: Record<string, unknown> = { qaScore, legalPassed };

    const rows = await this.db.query<VaultRow>(
      `INSERT INTO saas_compliance_vault
         (tenant_id, deliverable_source, deliverable_ref, pack_run_id, pack_id,
          title, consent_type, qa_pdf_url, content_hash, status, metadata)
       VALUES ($1, 'pack_run', $2, $3, $4, $5, 'qa_certificate', $6, $7,
         CASE WHEN $8::boolean = true THEN 'verified' ELSE 'pending' END,
         $9::jsonb)
       ON CONFLICT (tenant_id, deliverable_source, deliverable_ref, consent_type)
       DO UPDATE SET
         qa_pdf_url    = EXCLUDED.qa_pdf_url,
         content_hash  = EXCLUDED.content_hash,
         metadata      = EXCLUDED.metadata,
         status        = CASE WHEN $8::boolean = true THEN 'verified' ELSE
                           CASE WHEN saas_compliance_vault.status = 'revoked'
                                THEN 'revoked' ELSE 'pending' END END,
         updated_at    = NOW()
       RETURNING *`,
      [
        tenantId,
        packRunId,          // deliverable_ref
        packRunId,          // pack_run_id
        run.pack_id,
        `Pack run ${packRunId.slice(0, 8)}`,
        reportUrl,
        hash,
        legalPassed === true,
        JSON.stringify(metadata),
      ],
    );
    return rowToArtifact(rows[0]!);
  }

  // ── Sync from deliverables hub ────────────────────────────────────────────

  async syncFromDeliverablesHub(tenantId: string): Promise<{
    synced: number;
    artifacts: ComplianceArtifact[];
  }> {
    // Resolve workspace_id for OS/pack_run bridge
    const tenantRows = await this.db.query<{ workspace_id: number | null }>(
      `SELECT workspace_id FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    const workspaceId = tenantRows[0]?.workspace_id ?? null;

    const synced: ComplianceArtifact[] = [];

    // 1. OS deliverables (if workspace_id available)
    if (workspaceId) {
      const osRows = await this.db.query<{
        id: string;
        type: string | null;
        title: string;
        file_url: string | null;
        metadata: Record<string, unknown>;
      }>(
        `SELECT id, type, title, file_url, metadata
         FROM os_deliverables
         WHERE workspace_id = $1 AND status = 'completed'`,
        [workspaceId],
      );

      for (const row of osRows) {
        const meta = row.metadata ?? {};
        const qaScore = (meta as { qa_score?: number }).qa_score ?? null;
        const legalPassed = (meta as { legal_passed?: boolean }).legal_passed ?? null;
        if (qaScore === null && legalPassed === null) continue;

        try {
          const hash = this.computeContentHash(
            `${row.id}:${qaScore ?? ""}:${String(legalPassed ?? "")}`,
          );
          const rows = await this.db.query<VaultRow>(
            `INSERT INTO saas_compliance_vault
               (tenant_id, deliverable_source, deliverable_ref, title,
                consent_type, legal_doc_url, content_hash, status, metadata)
             VALUES ($1, 'os', $2, $3, 'qa_certificate', $4, $5,
               CASE WHEN $6::boolean = true THEN 'verified' ELSE 'pending' END,
               $7::jsonb)
             ON CONFLICT (tenant_id, deliverable_source, deliverable_ref, consent_type)
             DO UPDATE SET
               content_hash = EXCLUDED.content_hash,
               metadata     = EXCLUDED.metadata,
               updated_at   = NOW()
             RETURNING *`,
            [
              tenantId,
              row.id,
              row.title,
              row.file_url,
              hash,
              legalPassed === true,
              JSON.stringify({ qaScore, legalPassed }),
            ],
          );
          if (rows[0]) synced.push(rowToArtifact(rows[0]));
        } catch { /* skip on error, don't abort batch */ }
      }

      // 2. Pack runs via workspace
      const packRows = await this.db.query<{
        id: string;
        pack_id: string;
        report: Record<string, unknown> | null;
      }>(
        `SELECT id, pack_id, report FROM nelvyon_pack_runs
         WHERE workspace_id = $1 AND status = 'completed'`,
        [workspaceId],
      );

      for (const run of packRows) {
        try {
          const artifact = await this.syncFromPackRun(tenantId, run.id);
          synced.push(artifact);
        } catch { /* skip */ }
      }
    }

    // 3. Recurring deliverables (tenant-scoped, no workspace needed)
    const recurringRows = await this.db.query<{
      id: string;
      service_type: string;
      payload: Record<string, unknown>;
    }>(
      `SELECT id, service_type, payload
       FROM saas_recurring_deliverables
       WHERE tenant_id = $1 AND status = 'completed'`,
      [tenantId],
    );

    for (const row of recurringRows) {
      const payload = row.payload ?? {};
      const qaScore = (payload as { qa_score?: number }).qa_score ?? null;
      if (qaScore === null) continue;

      try {
        const hash = this.computeContentHash(`${row.id}:${qaScore ?? ""}`);
        const rows = await this.db.query<VaultRow>(
          `INSERT INTO saas_compliance_vault
             (tenant_id, deliverable_source, deliverable_ref, title,
              consent_type, content_hash, status, metadata)
           VALUES ($1, 'recurring', $2, $3, 'qa_certificate', $4, 'pending', $5::jsonb)
           ON CONFLICT (tenant_id, deliverable_source, deliverable_ref, consent_type)
           DO UPDATE SET
             content_hash = EXCLUDED.content_hash,
             metadata     = EXCLUDED.metadata,
             updated_at   = NOW()
           RETURNING *`,
          [
            tenantId,
            row.id,
            `${row.service_type} — ${row.id.slice(0, 8)}`,
            hash,
            JSON.stringify({ qaScore }),
          ],
        );
        if (rows[0]) synced.push(rowToArtifact(rows[0]));
      } catch { /* skip */ }
    }

    return { synced: synced.length, artifacts: synced };
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async attachDocument(
    tenantId: string,
    artifactId: string,
    input: AttachDocumentInput,
  ): Promise<ComplianceArtifact> {
    const existing = await this.getArtifact(tenantId, artifactId);
    if (!existing) throw new SaasComplianceVaultError("NOT_FOUND", `Artifact ${artifactId} no encontrado`);

    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [artifactId, tenantId];
    let idx = 3;

    if (input.legalDocUrl !== undefined) { sets.push(`legal_doc_url = $${idx++}`); params.push(input.legalDocUrl); }
    if (input.qaPdfUrl !== undefined) { sets.push(`qa_pdf_url = $${idx++}`); params.push(input.qaPdfUrl); }
    if (input.contentHash !== undefined) { sets.push(`content_hash = $${idx++}`); params.push(input.contentHash); }
    if (input.metadata !== undefined) { sets.push(`metadata = metadata || $${idx++}::jsonb`); params.push(JSON.stringify(input.metadata)); }

    const rows = await this.db.query<VaultRow>(
      `UPDATE saas_compliance_vault SET ${sets.join(", ")}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      params,
    );
    return rowToArtifact(rows[0]!);
  }

  async verifyArtifact(
    tenantId: string,
    artifactId: string,
    userId?: string,
  ): Promise<ComplianceArtifact> {
    const existing = await this.getArtifact(tenantId, artifactId);
    if (existing.status === "revoked") {
      throw new SaasComplianceVaultError("ALREADY_VERIFIED", "Artifact revocado no puede verificarse");
    }

    const rows = await this.db.query<VaultRow>(
      `UPDATE saas_compliance_vault
       SET status = 'verified', verified_at = NOW(), verified_by = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [artifactId, tenantId, userId ?? null],
    );
    return rowToArtifact(rows[0]!);
  }

  async revokeArtifact(
    tenantId: string,
    artifactId: string,
    reason?: string,
  ): Promise<ComplianceArtifact> {
    await this.getArtifact(tenantId, artifactId); // ensures exists + tenant isolation

    const meta = reason ? JSON.stringify({ revoke_reason: reason }) : "{}";
    const rows = await this.db.query<VaultRow>(
      `UPDATE saas_compliance_vault
       SET status = 'revoked', metadata = metadata || $3::jsonb, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [artifactId, tenantId, meta],
    );
    return rowToArtifact(rows[0]!);
  }
}
