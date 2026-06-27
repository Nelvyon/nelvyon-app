/**
 * O17 — OsPackCertificationService
 * Certifies all 8 pack runners end-to-end: runs each with a valid fixture intake,
 * captures QA score / legal / steps / deliverables, and records pass|fail. A pack
 * only certifies "passed" when the run completes with QA ≥ 85 and legal passed.
 *
 * The runner port is injectable so vitest can certify against a mock runner
 * (the real orchestrator needs DATABASE_URL); production lazy-loads RUNNERS.
 */

export type CertDbPort = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
};

// ── Runner port (RUNNERS map, injectable) ────────────────────────────────────────

export type PackRunOutcome = {
  id: string;
  status: "running" | "completed" | "failed" | "needs_review";
  steps: Array<{ status: string }>;
  report: {
    kpis?: { avg_qa_score?: number; deliverables_published?: number };
    sku_results?: Array<{ qa_legal_passed?: boolean; deliverable_ids?: string[] }>;
  } | null;
  error_message?: string | null;
};

export type CertRunnerPort = {
  run(packId: string, params: { workspaceId: number; userId: string; intake: unknown }): Promise<PackRunOutcome>;
  validate(packId: string, intake: unknown): boolean;
  has(packId: string): boolean;
};

// ── Fixture intakes (valid briefs, no LLM invention) ─────────────────────────────

export const PACK_FIXTURES: Record<string, Record<string, unknown>> = {
  "local-business-growth": { business_name: "Pizzería Napoli", city: "Madrid", value_proposition: "La mejor pizza artesanal del barrio", primary_cta: "Reservar mesa", sector: "restaurant" },
  "ecommerce-growth": { business_name: "ModaVerde", city: "Barcelona", value_proposition: "Moda sostenible entregada en 24h", primary_cta: "Comprar ahora", sector: "ecommerce", product_category: "Moda sostenible", primary_channel: "meta" },
  "saas-b2b-growth": { business_name: "FlowMetrics", city: "Valencia", value_proposition: "Analítica de producto para equipos PLG", primary_cta: "Solicitar demo", sector: "saas_b2b", icp_title: "VP of Engineering", pricing_model: "subscription", sales_motion: "hybrid" },
  "social-calendar-pack": { business_name: "Café Central", city: "Sevilla", value_proposition: "Contenido social que llena tu local", primary_cta: "Síguenos", sector: "local" },
  "content-strategy-pack": { business_name: "FlowMetrics", city: "Madrid", value_proposition: "Plan editorial que trae demanda inbound", primary_cta: "Descargar guía", sector: "saas_b2b" },
  "cro-audit-pack": { business_name: "ModaVerde", city: "Barcelona", value_proposition: "Optimiza tu checkout y vende más", primary_cta: "Auditar funnel", sector: "ecommerce" },
  "analytics-setup-pack": { business_name: "FlowMetrics", city: "Valencia", value_proposition: "Mide lo que importa con GA4 bien configurado", primary_cta: "Empezar", sector: "saas_b2b" },
  "brand-voice-pack": { business_name: "Café Central", city: "Sevilla", value_proposition: "Una voz de marca coherente en todos los canales", primary_cta: "Conocer más", sector: "local" },
};

export const ALL_PACK_IDS = Object.keys(PACK_FIXTURES);

const BETA_PACK_IDS = new Set(["social-calendar-pack", "content-strategy-pack", "cro-audit-pack", "analytics-setup-pack", "brand-voice-pack"]);

const QA_THRESHOLD = 85;
const CERT_VALIDITY_DAYS = 90;

// ── Types ───────────────────────────────────────────────────────────────────────

export type CertStatus = "pending" | "running" | "passed" | "failed";

export type PackCertification = {
  packId: string;
  status: CertStatus;
  lastRunId: string | null;
  qaScore: number | null;
  legalPassed: boolean | null;
  stepsCompleted: number;
  stepsTotal: number;
  deliverablesCount: number;
  autoApproved: boolean;
  failureReason: string | null;
  runDurationMs: number | null;
  certifiedAt: string | null;
  lastCheckedAt: string;
  metadata: Record<string, unknown>;
};

export type CertSummary = { passed: number; failed: number; pending: number; running: number; total: number };

export type OsPackCertErrorCode = "NOT_FOUND" | "VALIDATION" | "NOT_CERTIFIED";

export class OsPackCertError extends Error {
  constructor(
    public readonly code: OsPackCertErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OsPackCertError";
  }
}

type CertRow = {
  pack_id: string;
  status: CertStatus;
  last_run_id: string | null;
  qa_score: number | null;
  legal_passed: boolean | null;
  steps_completed: number;
  steps_total: number;
  deliverables_count: number;
  auto_approved: boolean;
  failure_reason: string | null;
  run_duration_ms: number | null;
  certified_at: string | null;
  last_checked_at: string;
  metadata: Record<string, unknown>;
};

function rowToCert(r: CertRow): PackCertification {
  return {
    packId: r.pack_id,
    status: r.status,
    lastRunId: r.last_run_id,
    qaScore: r.qa_score,
    legalPassed: r.legal_passed,
    stepsCompleted: r.steps_completed,
    stepsTotal: r.steps_total,
    deliverablesCount: r.deliverables_count,
    autoApproved: r.auto_approved,
    failureReason: r.failure_reason,
    runDurationMs: r.run_duration_ms,
    certifiedAt: r.certified_at,
    lastCheckedAt: r.last_checked_at,
    metadata: r.metadata ?? {},
  };
}

// ── Default runner port (lazy-loads RUNNERS) ──────────────────────────────────────

const defaultRunnerPort: CertRunnerPort = {
  has(packId) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RUNNERS } = require("../../../apps/web/src/app/api/os/packs/[packId]/kickoff/runnersMap") as { RUNNERS: Record<string, unknown> };
    return packId in RUNNERS;
  },
  validate(packId, intake) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RUNNERS } = require("../../../apps/web/src/app/api/os/packs/[packId]/kickoff/runnersMap") as {
      RUNNERS: Record<string, { validate: (b: unknown) => unknown }>;
    };
    const entry = RUNNERS[packId];
    return !!entry && entry.validate(intake) !== null;
  },
  async run(packId, params) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RUNNERS } = require("../../../apps/web/src/app/api/os/packs/[packId]/kickoff/runnersMap") as {
      RUNNERS: Record<string, { run: (p: { workspaceId: number; userId: string; intake: never }) => Promise<PackRunOutcome> }>;
    };
    const entry = RUNNERS[packId];
    if (!entry) throw new OsPackCertError("NOT_FOUND", `Runner ${packId} no encontrado`);
    return entry.run({ workspaceId: params.workspaceId, userId: params.userId, intake: params.intake as never });
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsPackCertificationService | null = null;

export function getOsPackCertificationService(): OsPackCertificationService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../../db/DbClient") as { DbClient: { getInstance(): CertDbPort } };
    _instance = new OsPackCertificationService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsPackCertificationServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsPackCertificationService {
  constructor(
    private readonly db: CertDbPort,
    private readonly runners: CertRunnerPort = defaultRunnerPort,
  ) {}

  /** Evaluate a finished pack run into certification fields. */
  evaluateOutcome(outcome: PackRunOutcome): {
    status: CertStatus; qaScore: number; legalPassed: boolean;
    stepsCompleted: number; stepsTotal: number; deliverablesCount: number; failureReason: string | null;
  } {
    const stepsTotal = outcome.steps?.length ?? 0;
    const stepsCompleted = (outcome.steps ?? []).filter((s) => s.status === "done").length;
    const qaScore = Math.round(outcome.report?.kpis?.avg_qa_score ?? 0);
    const skuResults = outcome.report?.sku_results ?? [];
    const legalPassed = skuResults.length > 0 && skuResults.every((r) => r.qa_legal_passed !== false);
    const deliverablesCount =
      outcome.report?.kpis?.deliverables_published ??
      skuResults.reduce((acc, r) => acc + (r.deliverable_ids?.length ?? 0), 0);

    let status: CertStatus = "failed";
    let failureReason: string | null = null;
    if (outcome.status !== "completed") {
      failureReason = outcome.error_message || `Run status ${outcome.status}`;
    } else if (qaScore < QA_THRESHOLD) {
      failureReason = `QA score ${qaScore} < ${QA_THRESHOLD}`;
    } else if (!legalPassed) {
      failureReason = "Legal QA no superado";
    } else {
      status = "passed";
    }
    return { status, qaScore, legalPassed, stepsCompleted, stepsTotal, deliverablesCount, failureReason };
  }

  private async upsert(packId: string, fields: Partial<CertRow>): Promise<PackCertification> {
    const rows = await this.db.query<CertRow>(
      `INSERT INTO os_pack_certifications
         (pack_id, status, last_run_id, qa_score, legal_passed, steps_completed, steps_total,
          deliverables_count, auto_approved, failure_reason, run_duration_ms, certified_at, last_checked_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW(), $13::jsonb)
       ON CONFLICT (pack_id) DO UPDATE SET
         status = EXCLUDED.status,
         last_run_id = EXCLUDED.last_run_id,
         qa_score = EXCLUDED.qa_score,
         legal_passed = EXCLUDED.legal_passed,
         steps_completed = EXCLUDED.steps_completed,
         steps_total = EXCLUDED.steps_total,
         deliverables_count = EXCLUDED.deliverables_count,
         auto_approved = EXCLUDED.auto_approved,
         failure_reason = EXCLUDED.failure_reason,
         run_duration_ms = EXCLUDED.run_duration_ms,
         certified_at = EXCLUDED.certified_at,
         last_checked_at = NOW(),
         metadata = EXCLUDED.metadata
       RETURNING *`,
      [
        packId,
        fields.status ?? "pending",
        fields.last_run_id ?? null,
        fields.qa_score ?? null,
        fields.legal_passed ?? null,
        fields.steps_completed ?? 0,
        fields.steps_total ?? 0,
        fields.deliverables_count ?? 0,
        fields.auto_approved ?? false,
        fields.failure_reason ?? null,
        fields.run_duration_ms ?? null,
        fields.certified_at ?? null,
        JSON.stringify(fields.metadata ?? {}),
      ],
    );
    return rowToCert(rows[0]!);
  }

  /** UPSERT the 8-pack catalog in 'pending' (without running). */
  async syncPackCatalog(): Promise<{ synced: number }> {
    let synced = 0;
    for (const packId of ALL_PACK_IDS) {
      const existing = await this.db.query<{ pack_id: string }>(
        `SELECT pack_id FROM os_pack_certifications WHERE pack_id = $1`,
        [packId],
      );
      if (existing[0]) { synced++; continue; }
      await this.db.query(
        `INSERT INTO os_pack_certifications (pack_id, status, steps_total)
         VALUES ($1, 'pending', 10)
         ON CONFLICT (pack_id) DO NOTHING`,
        [packId],
      );
      synced++;
    }
    return { synced };
  }

  /** Run one pack end-to-end and persist its certification. */
  async runCertification(
    packId: string,
    opts: { workspaceId?: number; userId?: string; dryRun?: boolean } = {},
  ): Promise<PackCertification> {
    const intake = PACK_FIXTURES[packId];
    if (!intake) throw new OsPackCertError("NOT_FOUND", `Pack ${packId} sin fixture`);
    if (!this.runners.has(packId)) throw new OsPackCertError("NOT_FOUND", `Runner ${packId} no registrado`);
    if (!this.runners.validate(packId, intake)) {
      throw new OsPackCertError("VALIDATION", `Fixture inválido para ${packId}`);
    }
    if (opts.dryRun) {
      // Validation-only: confirms the fixture passes validate() without running.
      return this.upsert(packId, { status: "pending", metadata: { dryRun: true } });
    }

    await this.upsert(packId, { status: "running" });
    const startedAt = Date.now();
    try {
      const outcome = await this.runners.run(packId, {
        workspaceId: opts.workspaceId ?? 1,
        userId: opts.userId ?? "cert-bot",
        intake,
      });
      const ev = this.evaluateOutcome(outcome);
      return this.upsert(packId, {
        status: ev.status,
        last_run_id: outcome.id,
        qa_score: ev.qaScore,
        legal_passed: ev.legalPassed,
        steps_completed: ev.stepsCompleted,
        steps_total: ev.stepsTotal,
        deliverables_count: ev.deliverablesCount,
        auto_approved: ev.status === "passed" && ev.qaScore >= QA_THRESHOLD,
        failure_reason: ev.failureReason,
        run_duration_ms: Date.now() - startedAt,
        certified_at: ev.status === "passed" ? new Date().toISOString() : null,
        metadata: { isBeta: BETA_PACK_IDS.has(packId) },
      });
    } catch (e) {
      return this.upsert(packId, {
        status: "failed",
        failure_reason: e instanceof Error ? e.message : String(e),
        run_duration_ms: Date.now() - startedAt,
      });
    }
  }

  /** Certify all 8 packs sequentially (CI-safe). */
  async runAllCertifications(opts: { workspaceId?: number; userId?: string; dryRun?: boolean } = {}): Promise<PackCertification[]> {
    const out: PackCertification[] = [];
    for (const packId of ALL_PACK_IDS) {
      out.push(await this.runCertification(packId, opts));
    }
    return out;
  }

  async getCertification(packId: string): Promise<PackCertification> {
    const rows = await this.db.query<CertRow>(`SELECT * FROM os_pack_certifications WHERE pack_id = $1`, [packId]);
    if (!rows[0]) throw new OsPackCertError("NOT_FOUND", `Certificación ${packId} no encontrada`);
    return rowToCert(rows[0]);
  }

  async listCertifications(): Promise<PackCertification[]> {
    const rows = await this.db.query<CertRow>(
      `SELECT * FROM os_pack_certifications ORDER BY status ASC, pack_id ASC`,
    );
    return rows.map(rowToCert);
  }

  async getSummary(): Promise<CertSummary> {
    const list = await this.listCertifications();
    return {
      total: list.length,
      passed: list.filter((c) => c.status === "passed").length,
      failed: list.filter((c) => c.status === "failed").length,
      pending: list.filter((c) => c.status === "pending").length,
      running: list.filter((c) => c.status === "running").length,
    };
  }

  /**
   * Promote a beta pack to "available" — only with a fresh passing certification.
   * Persists a `promoted_to_available` flag (runtime-backed; static catalog is the
   * default, this flag overrides it via getPackAvailabilityFromCert).
   */
  async promoteToAvailable(packId: string): Promise<PackCertification> {
    const can = await this.canPromoteToAvailable(packId);
    if (!can) {
      throw new OsPackCertError("NOT_CERTIFIED", `Pack ${packId} no tiene certificación válida (<90d, passed)`);
    }
    const current = await this.getCertification(packId);
    return this.upsert(packId, {
      status: current.status,
      last_run_id: current.lastRunId,
      qa_score: current.qaScore,
      legal_passed: current.legalPassed,
      steps_completed: current.stepsCompleted,
      steps_total: current.stepsTotal,
      deliverables_count: current.deliverablesCount,
      auto_approved: current.autoApproved,
      run_duration_ms: current.runDurationMs,
      certified_at: current.certifiedAt,
      metadata: { ...current.metadata, promoted_to_available: true, promoted_at: new Date().toISOString() },
    });
  }

  /** Read-only effective availability override from cert state ('available' | null). */
  async getPackAvailabilityFromCert(packId: string): Promise<"available" | null> {
    try {
      const rows = await this.db.query<{ status: CertStatus; metadata: Record<string, unknown> }>(
        `SELECT status, metadata FROM os_pack_certifications WHERE pack_id = $1`,
        [packId],
      );
      const cert = rows[0];
      if (cert?.status === "passed" && cert.metadata?.promoted_to_available === true) return "available";
      return null;
    } catch {
      return null;
    }
  }

  /** True only when a fresh (<90d) passing certification exists. */
  async canPromoteToAvailable(packId: string): Promise<boolean> {
    const rows = await this.db.query<{ status: CertStatus; certified_at: string | null }>(
      `SELECT status, certified_at FROM os_pack_certifications WHERE pack_id = $1`,
      [packId],
    );
    const cert = rows[0];
    if (!cert || cert.status !== "passed" || !cert.certified_at) return false;
    const ageMs = Date.now() - new Date(cert.certified_at).getTime();
    return ageMs <= CERT_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
  }
}
