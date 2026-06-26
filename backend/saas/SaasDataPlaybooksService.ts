/**
 * S53 — SaasDataPlaybooksService
 * Auto-generates personalized growth playbooks from the tenant's REAL data
 * (email metrics, ROAS, QA scores, benchmark gaps, autopilot, compliance).
 *
 * v1 uses deterministic rules — no LLM required. Token interpolation injects
 * the tenant's own numbers into each insight/action so the advice is concrete.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { resolveIndustryKey } from "../os-agents/benchmarks/industryBenchmarks";

// ── Types ───────────────────────────────────────────────────────────────────────

export type PlaybookCategory = "growth" | "retention" | "ads" | "email" | "seo" | "compliance";
export type PlaybookStatus = "suggested" | "active" | "dismissed" | "completed";
export type PlaybookStepType =
  | "insight"
  | "action"
  | "email_draft"
  | "launch_pack"
  | "enable_autopilot"
  | "review_metric";

export type TenantDataContext = {
  companyName: string;
  industry: string;
  sectorKey: string;
  openRate: number | null;
  ctr: number | null;
  roas: number | null;
  qaScore: number | null;
  launchesUsed: number;
  benchmarkOverall: number | null; // 0-100 overall score
  sectorAvgOpen: number | null;
  autopilotEnabled: boolean;
  compliancePending: number;
  topPackId: string | null;
};

export type DataPlaybookStep = {
  id: string;
  playbookId: string;
  sortOrder: number;
  stepType: PlaybookStepType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  completed: boolean;
};

export type DataPlaybook = {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  triggerReason: string;
  category: PlaybookCategory;
  priority: number;
  status: PlaybookStatus;
  contextSnapshot: Record<string, unknown>;
  renderedSummary: string | null;
  packId: string | null;
  ctaHref: string | null;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  completedAt: string | null;
  steps?: DataPlaybookStep[];
};

/** Generated (pre-persistence) playbook shape. */
export type GeneratedPlaybook = {
  slug: string;
  title: string;
  triggerReason: string;
  category: PlaybookCategory;
  priority: number;
  renderedSummary: string;
  packId: string | null;
  ctaHref: string | null;
  steps: GeneratedStep[];
};

export type GeneratedStep = {
  stepType: PlaybookStepType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type PlaybooksSummary = {
  suggested: number;
  active: number;
  completed: number;
  dismissed: number;
};

export type GenerateResult = {
  generated: number;
  playbooks: DataPlaybook[];
};

export type SaasDataPlaybooksErrorCode = "NOT_FOUND" | "VALIDATION";

export class SaasDataPlaybooksError extends Error {
  constructor(
    public readonly code: SaasDataPlaybooksErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SaasDataPlaybooksError";
  }
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type PlaybookRow = {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  trigger_reason: string;
  category: PlaybookCategory;
  priority: number;
  status: PlaybookStatus;
  context_snapshot: Record<string, unknown>;
  rendered_summary: string | null;
  pack_id: string | null;
  cta_href: string | null;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  completed_at: string | null;
};

type StepRow = {
  id: string;
  playbook_id: string;
  sort_order: number;
  step_type: PlaybookStepType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  completed: boolean;
};

function rowToPlaybook(r: PlaybookRow): DataPlaybook {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    slug: r.slug,
    title: r.title,
    triggerReason: r.trigger_reason,
    category: r.category,
    priority: r.priority,
    status: r.status,
    contextSnapshot: r.context_snapshot ?? {},
    renderedSummary: r.rendered_summary,
    packId: r.pack_id,
    ctaHref: r.cta_href,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    activatedAt: r.activated_at,
    completedAt: r.completed_at,
  };
}

function rowToStep(r: StepRow): DataPlaybookStep {
  return {
    id: r.id,
    playbookId: r.playbook_id,
    sortOrder: r.sort_order,
    stepType: r.step_type,
    title: r.title,
    body: r.body,
    metadata: r.metadata ?? {},
    completed: r.completed,
  };
}

// ── Formatting helpers ───────────────────────────────────────────────────────────

function pct(v: number | null): string {
  return v === null ? "—" : `${(v * 100).toFixed(1)}%`;
}

function numStr(v: number | null, decimals = 1): string {
  return v === null ? "—" : v.toFixed(decimals);
}

const PACK_NAMES: Record<string, string> = {
  "local-business-growth": "Crecimiento Local",
  "ecommerce-growth": "Crecimiento Ecommerce",
  "saas-b2b-growth": "Crecimiento SaaS B2B",
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: SaasDataPlaybooksService | null = null;

export function getSaasDataPlaybooksService(): SaasDataPlaybooksService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as {
      DbClient: { getInstance(): SaasPostgresPort };
    };
    _instance = new SaasDataPlaybooksService(DbClient.getInstance());
  }
  return _instance;
}

export function resetSaasDataPlaybooksServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class SaasDataPlaybooksService {
  constructor(private readonly db: SaasPostgresPort) {}

  /** Replace {{token}} placeholders with the tenant's real values. */
  interpolate(text: string, ctx: TenantDataContext): string {
    const map: Record<string, string> = {
      company_name: ctx.companyName,
      industry: ctx.industry,
      sector: ctx.sectorKey,
      open_rate: pct(ctx.openRate),
      ctr: pct(ctx.ctr),
      sector_avg_open: pct(ctx.sectorAvgOpen),
      roas: ctx.roas === null ? "sin datos" : `${numStr(ctx.roas, 2)}x`,
      qa_score: ctx.qaScore === null ? "—" : `${numStr(ctx.qaScore, 0)}`,
      benchmark_overall: ctx.benchmarkOverall === null ? "—" : `${ctx.benchmarkOverall}%`,
      pack_name: ctx.topPackId ? (PACK_NAMES[ctx.topPackId] ?? ctx.topPackId) : "un pack de crecimiento",
      compliance_pending: String(ctx.compliancePending),
    };
    return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
      key in map ? map[key] : `{{${key}}}`,
    );
  }

  // ── Context aggregation ──────────────────────────────────────────────────────

  /** Aggregate the tenant's real metrics into a single context object. */
  async buildTenantContext(tenantId: string): Promise<TenantDataContext> {
    const ctx: TenantDataContext = {
      companyName: "tu empresa",
      industry: "general",
      sectorKey: "default",
      openRate: null,
      ctr: null,
      roas: null,
      qaScore: null,
      launchesUsed: 0,
      benchmarkOverall: null,
      sectorAvgOpen: null,
      autopilotEnabled: false,
      compliancePending: 0,
      topPackId: null,
    };

    // Company + industry
    try {
      const rows = await this.db.query<{ company_name: string | null; industry: string | null }>(
        `SELECT company_name, industry FROM saas_tenants WHERE id = $1 LIMIT 1`,
        [tenantId],
      );
      if (rows[0]) {
        ctx.companyName = rows[0].company_name?.trim() || ctx.companyName;
        ctx.industry = rows[0].industry?.trim() || ctx.industry;
        ctx.sectorKey = resolveIndustryKey({ industry: ctx.industry });
      }
    } catch { /* keep defaults */ }

    // Email open/click rate (last 30d)
    try {
      const rows = await this.db.query<{ sent: string; opened: string; clicked: string }>(
        `SELECT COALESCE(SUM(sent_count),0) AS sent,
                COALESCE(SUM(opened_count),0) AS opened,
                COALESCE(SUM(clicked_count),0) AS clicked
         FROM saas_campanias
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [tenantId],
      );
      const sent = parseInt(rows[0]?.sent ?? "0", 10);
      if (sent > 0) {
        ctx.openRate = parseInt(rows[0]!.opened, 10) / sent;
        ctx.ctr = parseInt(rows[0]!.clicked, 10) / sent;
      }
    } catch { /* leave null */ }

    // ROAS (avg from deliverable revenue)
    try {
      const rows = await this.db.query<{ avg_roas: string | null }>(
        `SELECT AVG(roas)::numeric AS avg_roas
         FROM saas_deliverable_revenue
         WHERE tenant_id = $1 AND roas IS NOT NULL`,
        [tenantId],
      );
      if (rows[0]?.avg_roas != null) ctx.roas = parseFloat(rows[0].avg_roas);
    } catch { /* leave null */ }

    // QA score (avg pack run QA via workspace bridge) + launches used
    try {
      const rows = await this.db.query<{ avg_qa: string | null; launches: string; top_pack: string | null }>(
        `SELECT AVG((report->>'qaScore')::numeric) AS avg_qa,
                COUNT(*) AS launches,
                (SELECT pack_id FROM saas_pack_launches
                  WHERE tenant_id = $1 AND status = 'completed'
                  GROUP BY pack_id ORDER BY COUNT(*) DESC LIMIT 1) AS top_pack
         FROM saas_pack_launches
         WHERE tenant_id = $1 AND status = 'completed'`,
        [tenantId],
      );
      if (rows[0]) {
        if (rows[0].avg_qa != null) ctx.qaScore = parseFloat(rows[0].avg_qa);
        ctx.launchesUsed = parseInt(rows[0].launches ?? "0", 10);
        ctx.topPackId = rows[0].top_pack;
      }
    } catch { /* leave defaults */ }

    // Benchmark overall (latest snapshot) + sector avg open
    try {
      const rows = await this.db.query<{ summary: { overallScore?: number } | null; industry_metrics: Record<string, number | null> | null }>(
        `SELECT summary, industry_metrics
         FROM saas_benchmark_snapshots
         WHERE tenant_id = $1 ORDER BY computed_at DESC LIMIT 1`,
        [tenantId],
      );
      if (rows[0]?.summary?.overallScore != null) ctx.benchmarkOverall = rows[0].summary.overallScore;
      const open = rows[0]?.industry_metrics?.email_open_rate;
      if (open != null) ctx.sectorAvgOpen = open;
    } catch { /* leave null */ }

    // Autopilot enabled (any toggle on)
    try {
      const rows = await this.db.query<{ enabled: boolean }>(
        `SELECT (seo_enabled OR social_enabled OR reputation_enabled OR ads_enabled) AS enabled
         FROM saas_autopilot_settings WHERE tenant_id = $1 LIMIT 1`,
        [tenantId],
      );
      if (rows[0]) ctx.autopilotEnabled = !!rows[0].enabled;
    } catch { /* leave false */ }

    // Compliance pending
    try {
      const rows = await this.db.query<{ pending: string }>(
        `SELECT COUNT(*) AS pending FROM saas_compliance_vault
         WHERE tenant_id = $1 AND status = 'pending'`,
        [tenantId],
      );
      ctx.compliancePending = parseInt(rows[0]?.pending ?? "0", 10);
    } catch { /* leave 0 */ }

    return ctx;
  }

  // ── Rule-based generation ────────────────────────────────────────────────────

  /** Deterministic playbook generation from a tenant context. */
  generateFromContext(_tenantId: string, ctx: TenantDataContext): GeneratedPlaybook[] {
    const out: GeneratedPlaybook[] = [];
    const I = (t: string) => this.interpolate(t, ctx);

    // 1. Email open rate below sector average
    if (ctx.openRate !== null && ctx.sectorAvgOpen !== null && ctx.openRate < ctx.sectorAvgOpen) {
      out.push({
        slug: "improve-email-open-rate",
        title: "Mejora la apertura de tus emails",
        triggerReason: I("Tu apertura ({{open_rate}}) está por debajo de la media del sector ({{sector_avg_open}})"),
        category: "email",
        priority: 80,
        renderedSummary: I("{{company_name}} abre el {{open_rate}} de sus emails frente al {{sector_avg_open}} del sector {{industry}}. Optimiza asuntos y segmentación."),
        packId: null,
        ctaHref: "/saas/campanias",
        steps: [
          { stepType: "insight", title: "Diagnóstico", body: I("Apertura actual: {{open_rate}} · Media sector: {{sector_avg_open}}. Cerrar este gap puede subir tus conversiones de forma directa.") },
          { stepType: "email_draft", title: "Reescribe 3 asuntos", body: I("Crea 3 variantes de asunto más cortas y personalizadas para {{company_name}}. Prueba A/B con el 20% de tu lista.") },
          { stepType: "action", title: "Limpia tu lista", body: "Elimina contactos inactivos (>180 días sin abrir) para mejorar la entregabilidad." },
        ],
      });
    }

    // 2. ROAS missing or below 1
    if (ctx.roas === null || ctx.roas < 1) {
      out.push({
        slug: "fix-ads-attribution",
        title: "Recupera el control de tu ROAS",
        triggerReason: ctx.roas === null
          ? "No hay ROAS atribuido todavía — falta conectar ingresos a tus entregables"
          : I("Tu ROAS ({{roas}}) está por debajo de 1x — gastas más de lo que recuperas"),
        category: "ads",
        priority: 75,
        renderedSummary: ctx.roas === null
          ? "Vincula campañas y entregables para medir el retorno real de tu inversión publicitaria."
          : I("Con un ROAS de {{roas}}, revisa atribución y reasigna presupuesto a los entregables que sí convierten."),
        packId: null,
        ctaHref: "/saas/entregables?tab=revenue",
        steps: [
          { stepType: "review_metric", title: "Revisa Revenue por entregable", body: "Abre la pestaña Revenue en Entregables y verifica qué entregables tienen ROAS ≥ 2x.", metadata: { href: "/saas/entregables?tab=revenue" } },
          { stepType: "action", title: "Vincula campañas", body: "Asocia cada entregable a su campaña UTM para que el ROAS se calcule con datos reales." },
        ],
      });
    }

    // 3. Low QA score or no launches → launch a pack
    if (ctx.launchesUsed === 0 || (ctx.qaScore !== null && ctx.qaScore < 85)) {
      const suggestedPack = ctx.topPackId ?? "local-business-growth";
      out.push({
        slug: "launch-growth-pack",
        title: ctx.launchesUsed === 0 ? "Lanza tu primer pack de crecimiento" : "Sube la calidad de tus entregables",
        triggerReason: ctx.launchesUsed === 0
          ? "Todavía no has lanzado ningún pack — empieza a generar entregables"
          : I("Tu QA media ({{qa_score}}) está por debajo de 85 — relanza con mejor brief"),
        category: "growth",
        priority: 90,
        renderedSummary: I("{{company_name}} puede generar landing, SEO y chatbot en minutos lanzando {{pack_name}}."),
        packId: suggestedPack,
        ctaHref: `/saas/brief-to-launch?packId=${suggestedPack}`,
        steps: [
          { stepType: "launch_pack", title: "Lanza el pack", body: I("Lanza {{pack_name}} con un brief de 4 campos. La IA generará todos los entregables."), metadata: { packId: suggestedPack } },
          { stepType: "review_metric", title: "Revisa la QA", body: "Tras el lanzamiento, comprueba que el QA score sea ≥ 85 antes de enviar al portal del cliente." },
        ],
      });
    }

    // 4. Benchmark below average
    if (ctx.benchmarkOverall !== null && ctx.benchmarkOverall < 50) {
      out.push({
        slug: "close-sector-gaps",
        title: "Cierra los gaps frente a tu sector",
        triggerReason: I("Tu puntuación de benchmark ({{benchmark_overall}}) está por debajo del 50% — varias métricas bajo la media"),
        category: "growth",
        priority: 70,
        renderedSummary: I("Solo el {{benchmark_overall}} de tus métricas igualan o superan a {{industry}}. Prioriza las que más arrastran."),
        packId: null,
        ctaHref: "/saas/benchmark",
        steps: [
          { stepType: "review_metric", title: "Abre el Benchmark", body: "Revisa la tabla comparativa y ordena por las métricas con peor valoración.", metadata: { href: "/saas/benchmark" } },
          { stepType: "action", title: "Ataca la peor métrica", body: "Elige la métrica con rating 'crítico' y aplica el playbook correspondiente primero." },
        ],
      });
    }

    // 5. Compliance pending
    if (ctx.compliancePending > 0) {
      out.push({
        slug: "complete-compliance-vault",
        title: "Completa tu Compliance Vault",
        triggerReason: I("Tienes {{compliance_pending}} artifact(s) de compliance pendientes de verificar"),
        category: "compliance",
        priority: 60,
        renderedSummary: I("Verifica los {{compliance_pending}} artifacts pendientes para tener un audit trail legal completo por entregable."),
        packId: null,
        ctaHref: "/saas/compliance",
        steps: [
          { stepType: "review_metric", title: "Abre el Vault", body: "Revisa los artifacts en estado 'pendiente' y verifica los que tengan QA y legal aprobados.", metadata: { href: "/saas/compliance" } },
        ],
      });
    }

    // 6. Autopilot off
    if (!ctx.autopilotEnabled) {
      out.push({
        slug: "enable-autopilot",
        title: "Activa el Autopilot mensual",
        triggerReason: "El Autopilot está desactivado — estás generando entregables a mano",
        category: "growth",
        priority: 55,
        renderedSummary: I("Activa SEO, social o ads en automático para que {{company_name}} reciba entregables cada mes sin esfuerzo."),
        packId: null,
        ctaHref: "/saas/autopilot",
        steps: [
          { stepType: "enable_autopilot", title: "Enciende un servicio", body: "Activa al menos el SEO mensual en el Command Center del Autopilot.", metadata: { href: "/saas/autopilot" } },
        ],
      });
    }

    return out;
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  /** UPSERT generated playbooks by (tenant, slug). Never resurrects dismissed ones. */
  async upsertGeneratedPlaybooks(
    tenantId: string,
    playbooks: GeneratedPlaybook[],
    ctx: TenantDataContext,
  ): Promise<DataPlaybook[]> {
    const saved: DataPlaybook[] = [];
    const snapshot = JSON.stringify(ctx);

    for (const pb of playbooks) {
      // Skip if a dismissed playbook with this slug already exists.
      const existing = await this.db.query<{ id: string; status: PlaybookStatus }>(
        `SELECT id, status FROM saas_data_playbooks WHERE tenant_id = $1 AND slug = $2 LIMIT 1`,
        [tenantId, pb.slug],
      );
      if (existing[0]?.status === "dismissed") continue;

      const rows = await this.db.query<PlaybookRow>(
        `INSERT INTO saas_data_playbooks
           (tenant_id, slug, title, trigger_reason, category, priority, status,
            context_snapshot, rendered_summary, pack_id, cta_href)
         VALUES ($1,$2,$3,$4,$5,$6,'suggested',$7::jsonb,$8,$9,$10)
         ON CONFLICT (tenant_id, slug)
         DO UPDATE SET title = EXCLUDED.title,
                       trigger_reason = EXCLUDED.trigger_reason,
                       category = EXCLUDED.category,
                       priority = EXCLUDED.priority,
                       context_snapshot = EXCLUDED.context_snapshot,
                       rendered_summary = EXCLUDED.rendered_summary,
                       pack_id = EXCLUDED.pack_id,
                       cta_href = EXCLUDED.cta_href,
                       updated_at = NOW()
         WHERE saas_data_playbooks.status <> 'dismissed'
         RETURNING *`,
        [
          tenantId, pb.slug, pb.title, pb.triggerReason, pb.category, pb.priority,
          snapshot, pb.renderedSummary, pb.packId, pb.ctaHref,
        ],
      );
      const row = rows[0];
      if (!row) continue;

      // Rebuild steps (delete + reinsert) so generated content stays fresh.
      await this.db.query(`DELETE FROM saas_data_playbook_steps WHERE playbook_id = $1`, [row.id]);
      let order = 0;
      for (const st of pb.steps) {
        await this.db.query(
          `INSERT INTO saas_data_playbook_steps
             (playbook_id, tenant_id, sort_order, step_type, title, body, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
          [row.id, tenantId, order++, st.stepType, st.title, st.body, JSON.stringify(st.metadata ?? {})],
        );
      }
      saved.push(rowToPlaybook(row));
    }
    return saved;
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  async listPlaybooks(tenantId: string, status?: PlaybookStatus): Promise<DataPlaybook[]> {
    const conditions = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    if (status) {
      conditions.push("status = $2");
      params.push(status);
    }
    const rows = await this.db.query<PlaybookRow>(
      `SELECT * FROM saas_data_playbooks
       WHERE ${conditions.join(" AND ")}
       ORDER BY priority DESC, created_at DESC`,
      params,
    );
    return rows.map(rowToPlaybook);
  }

  async getPlaybook(tenantId: string, id: string): Promise<DataPlaybook> {
    const rows = await this.db.query<PlaybookRow>(
      `SELECT * FROM saas_data_playbooks WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    const row = rows[0];
    if (!row) throw new SaasDataPlaybooksError("NOT_FOUND", `Playbook ${id} no encontrado`);
    const stepRows = await this.db.query<StepRow>(
      `SELECT * FROM saas_data_playbook_steps WHERE playbook_id = $1 ORDER BY sort_order ASC`,
      [id],
    );
    return { ...rowToPlaybook(row), steps: stepRows.map(rowToStep) };
  }

  async activatePlaybook(tenantId: string, id: string): Promise<DataPlaybook> {
    const rows = await this.db.query<PlaybookRow>(
      `UPDATE saas_data_playbooks
       SET status = 'active', activated_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status <> 'completed'
       RETURNING *`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasDataPlaybooksError("NOT_FOUND", `Playbook ${id} no encontrado`);
    return rowToPlaybook(rows[0]);
  }

  async dismissPlaybook(tenantId: string, id: string): Promise<DataPlaybook> {
    const rows = await this.db.query<PlaybookRow>(
      `UPDATE saas_data_playbooks
       SET status = 'dismissed', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasDataPlaybooksError("NOT_FOUND", `Playbook ${id} no encontrado`);
    return rowToPlaybook(rows[0]);
  }

  async completeStep(tenantId: string, playbookId: string, stepId: string): Promise<DataPlaybookStep> {
    const rows = await this.db.query<StepRow>(
      `UPDATE saas_data_playbook_steps
       SET completed = true
       WHERE id = $1 AND playbook_id = $2 AND tenant_id = $3
       RETURNING *`,
      [stepId, playbookId, tenantId],
    );
    if (!rows[0]) throw new SaasDataPlaybooksError("NOT_FOUND", `Step ${stepId} no encontrado`);
    return rowToStep(rows[0]);
  }

  async completePlaybook(tenantId: string, id: string): Promise<DataPlaybook> {
    const rows = await this.db.query<PlaybookRow>(
      `UPDATE saas_data_playbooks
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasDataPlaybooksError("NOT_FOUND", `Playbook ${id} no encontrado`);
    return rowToPlaybook(rows[0]);
  }

  async refreshPlaybooks(tenantId: string): Promise<GenerateResult> {
    const ctx = await this.buildTenantContext(tenantId);
    const generated = this.generateFromContext(tenantId, ctx);
    const playbooks = await this.upsertGeneratedPlaybooks(tenantId, generated, ctx);
    return { generated: playbooks.length, playbooks };
  }

  async getSummary(tenantId: string): Promise<PlaybooksSummary> {
    const rows = await this.db.query<{ status: PlaybookStatus; count: string }>(
      `SELECT status, COUNT(*) AS count FROM saas_data_playbooks
       WHERE tenant_id = $1 GROUP BY status`,
      [tenantId],
    );
    const summary: PlaybooksSummary = { suggested: 0, active: 0, completed: 0, dismissed: 0 };
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      if (r.status in summary) summary[r.status] = n;
    }
    return summary;
  }
}
