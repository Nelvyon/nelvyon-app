/**
 * O24 — OsCompetitorGapService
 * Operator pastes own domain + competitor URL → Nelvyon derives SEO/content/CRO gaps
 * (deterministic v1 rules over O21 agent data), scores them, recommends the right
 * pack, and can launch it via Brief-to-Launch. Standalone + audit log + HTML report.
 *
 * Ports injectable so vitest never hits live agent data / launches; prod lazy-loads.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Ports ───────────────────────────────────────────────────────────────────────

export type GapKeyword = { keyword: string; volume: number; cpc: number; difficulty: number };
export type GapCompetitor = { domain: string; organicKeywords: number; traffic: number };

export type AgentDataPort = {
  fetchKeywordSnapshot(input: { domain: string; userId?: string }): Promise<{ provider: string; keywords: GapKeyword[] }>;
  fetchCompetitorSnapshot(input: { domain: string; userId?: string }): Promise<{ provider: string; competitors: GapCompetitor[] }>;
};

export type PackLaunchPort = {
  suggestLaunch(input: { packId: string; brief: Record<string, unknown>; userId?: string; execute?: boolean }): Promise<{ launchId: string; packRunId: string | null }>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type GapSeverity = "high" | "medium" | "low";
export type GapCategory = "keyword" | "content" | "cro" | "strategy";

export type CompetitorGap = {
  category: GapCategory;
  severity: GapSeverity;
  title: string;
  detail: string;
};

export type GapRunStatus = "running" | "completed" | "failed";

export type CompetitorGapRun = {
  id: string;
  runKey: string;
  tenantId: string | null;
  workspaceId: number | null;
  ownDomain: string;
  competitorUrl: string;
  competitorDomain: string;
  status: GapRunStatus;
  gaps: CompetitorGap[];
  gapScore: number | null;
  recommendedPackId: string | null;
  recommendedSkus: string[];
  agentData: Record<string, unknown>;
  reportHtml?: string | null;
  packRunId: string | null;
  launchId: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
};

export type GapSummary = {
  total: number;
  completed: number;
  avgGapScore: number;
  topRecommendedPack: string | null;
};

export type OsCompetitorGapErrorCode = "NOT_FOUND" | "VALIDATION";

export class OsCompetitorGapError extends Error {
  constructor(public readonly code: OsCompetitorGapErrorCode, message: string) {
    super(message);
    this.name = "OsCompetitorGapError";
  }
}

// ── Helpers (exported pure functions for testability) ────────────────────────────

export function normalizeDomain(input: string): string {
  return String(input ?? "")
    .trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

const SEVERITY_WEIGHT: Record<GapSeverity, number> = { high: 25, medium: 15, low: 8 };

export function computeGapScore(gaps: CompetitorGap[]): number {
  const raw = gaps.reduce((acc, g) => acc + SEVERITY_WEIGHT[g.severity], 0);
  return Math.min(100, raw);
}

/** Deterministic v1 gap derivation from O21 agent data (best-effort inputs). */
export function deriveGaps(
  ownKeywords: GapKeyword[],
  competitors: GapCompetitor[],
  competitorDomain: string,
): CompetitorGap[] {
  const gaps: CompetitorGap[] = [];

  // Keyword gap — competitor outranks on volume the own domain doesn't cover.
  const ownSet = new Set(ownKeywords.map((k) => k.keyword.toLowerCase()));
  const strongCompetitor = competitors.find((c) => normalizeDomain(c.domain) === competitorDomain) ?? competitors[0];
  if (ownKeywords.length === 0) {
    gaps.push({
      category: "keyword",
      severity: "high",
      title: "Sin cobertura de keywords detectada",
      detail: "No hay keywords posicionadas para tu dominio — el competidor parte con ventaja orgánica.",
    });
  } else if (strongCompetitor && strongCompetitor.organicKeywords > ownKeywords.length * 5) {
    gaps.push({
      category: "keyword",
      severity: "high",
      title: "Brecha de keywords orgánicas",
      detail: `${competitorDomain} posiciona ~${strongCompetitor.organicKeywords} keywords; tú cubres ${ownSet.size}.`,
    });
  } else if (ownKeywords.length < 10) {
    gaps.push({
      category: "keyword",
      severity: "medium",
      title: "Cobertura de keywords baja",
      detail: `Solo ${ownKeywords.length} keywords relevantes — amplía clusters de contenido.`,
    });
  }

  // Content gap — always flag a content/structure review (heuristic v1).
  gaps.push({
    category: "content",
    severity: ownKeywords.length === 0 ? "high" : "medium",
    title: "Estructura de contenido mejorable",
    detail: "Asegura hero claro, prueba social, FAQ y CTA único frente al competidor.",
  });

  // CRO / trust gap — proxy from competitor traffic strength.
  if (strongCompetitor && strongCompetitor.traffic > 0) {
    gaps.push({
      category: "cro",
      severity: strongCompetitor.traffic > 5000 ? "high" : "medium",
      title: "Señales de confianza / conversión",
      detail: "El competidor recibe tráfico significativo — refuerza testimonios, garantías y velocidad de carga.",
    });
  }

  return gaps;
}

const RECOMMEND_SKUS: Record<string, string[]> = {
  "local-business-growth": ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
  "ecommerce-growth": ["NELVYON-LANDING", "NELVYON-SEO", "NELVYON-CHATBOT"],
  "cro-audit-pack": ["NELVYON-LANDING"],
  "content-strategy-pack": ["NELVYON-SEO"],
};

export function recommendPack(gaps: CompetitorGap[], opts: { sector?: string; hasProductCategory?: boolean } = {}): string {
  const byCat = (cat: GapCategory) => gaps.filter((g) => g.category === cat);
  const weight = (cat: GapCategory) => byCat(cat).reduce((a, g) => a + SEVERITY_WEIGHT[g.severity], 0);

  const cro = weight("cro");
  const keyword = weight("keyword");
  const content = weight("content");
  const strategy = weight("strategy");

  // CRO/trust heavy → cro-audit; pure strategy/content → content-strategy.
  if (cro > keyword && cro >= content && cro > 0) return "cro-audit-pack";
  if (strategy > keyword && strategy > content) return "content-strategy-pack";
  // keyword/content heavy → growth pack (ecommerce if product context)
  if (opts.hasProductCategory || opts.sector === "ecommerce") return "ecommerce-growth";
  return "local-business-growth";
}

export function buildBriefPatch(
  ownDomain: string,
  competitorUrl: string,
  gaps: CompetitorGap[],
  agentData: Record<string, unknown>,
): Record<string, unknown> {
  return {
    website_url: `https://${ownDomain}`,
    competitor_url: competitorUrl,
    value_proposition: `Cierra las brechas frente a ${normalizeDomain(competitorUrl)}: ${gaps.slice(0, 3).map((g) => g.title).join("; ")}`,
    _competitor_gap: { gaps, agentData },
  };
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type GapRow = {
  id: string; run_key: string; tenant_id: string | null; workspace_id: number | null;
  own_domain: string; competitor_url: string; competitor_domain: string; status: GapRunStatus;
  gaps: CompetitorGap[]; gap_score: string | null; recommended_pack_id: string | null;
  recommended_skus: string[]; agent_data: Record<string, unknown>; report_html: string | null;
  pack_run_id: string | null; launch_id: string | null; error_message: string | null;
  metadata: Record<string, unknown>; started_at: string; completed_at: string | null;
};

function rowToRun(r: GapRow, includeHtml = false): CompetitorGapRun {
  const run: CompetitorGapRun = {
    id: r.id, runKey: r.run_key, tenantId: r.tenant_id, workspaceId: r.workspace_id,
    ownDomain: r.own_domain, competitorUrl: r.competitor_url, competitorDomain: r.competitor_domain,
    status: r.status, gaps: r.gaps ?? [], gapScore: r.gap_score !== null ? parseFloat(r.gap_score) : null,
    recommendedPackId: r.recommended_pack_id, recommendedSkus: r.recommended_skus ?? [],
    agentData: r.agent_data ?? {}, packRunId: r.pack_run_id, launchId: r.launch_id,
    errorMessage: r.error_message, metadata: r.metadata ?? {}, startedAt: r.started_at, completedAt: r.completed_at,
  };
  if (includeHtml) run.reportHtml = r.report_html;
  return run;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ── Default ports ────────────────────────────────────────────────────────────────

const defaultAgentDataPort: AgentDataPort = {
  async fetchKeywordSnapshot(input) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getOsAgentDataService } = require("./OsAgentDataService") as {
      getOsAgentDataService: () => { fetchKeywordSnapshot(o: { domain: string; userId?: string }): Promise<{ provider: string; keywords: GapKeyword[] }> };
    };
    return getOsAgentDataService().fetchKeywordSnapshot(input);
  },
  async fetchCompetitorSnapshot(input) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getOsAgentDataService } = require("./OsAgentDataService") as {
      getOsAgentDataService: () => { fetchCompetitorSnapshot(o: { domain: string; userId?: string }): Promise<{ provider: string; competitors: GapCompetitor[] }> };
    };
    return getOsAgentDataService().fetchCompetitorSnapshot(input);
  },
};

const defaultPackLaunchPort: PackLaunchPort = {
  async suggestLaunch(input) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSaasBriefToLaunchService } = require("./SaasBriefToLaunchService") as {
      getSaasBriefToLaunchService: () => { createLaunch(t: string, i: { packId: string; brief: Record<string, unknown>; userId?: string }): Promise<{ id: string }> };
    };
    // tenantId is required by Brief-to-Launch; competitor-gap launch uses a platform tenant placeholder if absent.
    const tenantId = String((input.brief.tenant_id as string) ?? "platform");
    const launch = await getSaasBriefToLaunchService().createLaunch(tenantId, { packId: input.packId, brief: input.brief, userId: input.userId });
    return { launchId: launch.id, packRunId: null };
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsCompetitorGapService | null = null;

export function getOsCompetitorGapService(): OsCompetitorGapService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsCompetitorGapService(DbClient.getInstance(), defaultAgentDataPort, defaultPackLaunchPort);
  }
  return _instance;
}

export function resetOsCompetitorGapServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsCompetitorGapService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly agentData: AgentDataPort = defaultAgentDataPort,
    private readonly launches: PackLaunchPort = defaultPackLaunchPort,
  ) {}

  async startRun(input: { ownDomain: string; competitorUrl: string; tenantId?: string | null; workspaceId?: number | null; runKey?: string }): Promise<CompetitorGapRun> {
    const ownDomain = normalizeDomain(input.ownDomain);
    const competitorDomain = normalizeDomain(input.competitorUrl);
    if (!ownDomain || !competitorDomain) {
      throw new OsCompetitorGapError("VALIDATION", "ownDomain y competitorUrl son obligatorios");
    }
    const runKey = input.runKey ?? `gap-${Date.now()}`;
    const rows = await this.db.query<GapRow>(
      `INSERT INTO os_competitor_gap_runs (run_key, tenant_id, workspace_id, own_domain, competitor_url, competitor_domain, status)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, 'running')
       RETURNING *`,
      [runKey, input.tenantId ?? null, input.workspaceId ?? null, ownDomain, input.competitorUrl, competitorDomain],
    );
    return rowToRun(rows[0]!);
  }

  /** Pull agent data (best-effort), derive gaps, score, recommend, build HTML, persist. */
  async analyzeRun(runId: string, opts: { userId?: string; sector?: string; hasProductCategory?: boolean } = {}): Promise<CompetitorGapRun> {
    const existing = await this.getRun(runId);

    let agentData: Record<string, unknown> = {};
    let ownKeywords: GapKeyword[] = [];
    let competitors: GapCompetitor[] = [];
    try {
      const [kw, comp] = await Promise.all([
        this.agentData.fetchKeywordSnapshot({ domain: existing.ownDomain, userId: opts.userId }),
        this.agentData.fetchCompetitorSnapshot({ domain: existing.competitorDomain, userId: opts.userId }),
      ]);
      ownKeywords = kw.keywords ?? [];
      competitors = comp.competitors ?? [];
      agentData = {
        provider: kw.provider,
        ownKeywords: ownKeywords.slice(0, 20),
        competitors: competitors.slice(0, 5),
      };
    } catch {
      agentData = { provider: "none", reason: "no_provider" };
    }

    const gaps = deriveGaps(ownKeywords, competitors, existing.competitorDomain);
    const gapScore = computeGapScore(gaps);
    const recommendedPackId = recommendPack(gaps, { sector: opts.sector, hasProductCategory: opts.hasProductCategory });
    const recommendedSkus = RECOMMEND_SKUS[recommendedPackId] ?? [];

    const html = this.buildReportHtml({ ...existing, gaps, gapScore, recommendedPackId, recommendedSkus, agentData });

    const rows = await this.db.query<GapRow>(
      `UPDATE os_competitor_gap_runs
       SET status = 'completed', gaps = $2::jsonb, gap_score = $3, recommended_pack_id = $4,
           recommended_skus = $5::jsonb, agent_data = $6::jsonb, report_html = $7, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [runId, JSON.stringify(gaps), gapScore, recommendedPackId, JSON.stringify(recommendedSkus), JSON.stringify(agentData), html],
    );
    if (!rows[0]) throw new OsCompetitorGapError("NOT_FOUND", `Gap run ${runId} no encontrado`);
    return rowToRun(rows[0], true);
  }

  buildReportHtml(run: {
    ownDomain: string; competitorUrl: string; competitorDomain: string;
    gaps: CompetitorGap[]; gapScore: number | null; recommendedPackId: string | null;
    recommendedSkus: string[]; agentData: Record<string, unknown>;
  }): string {
    const sevColor: Record<GapSeverity, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
    const gapRows = run.gaps.map((g) =>
      `<tr><td style="padding:8px 12px"><span style="color:${sevColor[g.severity]}">●</span> ${esc(g.category)}</td>
       <td style="padding:8px 12px;color:#e6edf6">${esc(g.title)}</td>
       <td style="padding:8px 12px;color:#7a8aa0;font-size:12px">${esc(g.detail)}</td></tr>`).join("");
    const kws = ((run.agentData.competitors as GapCompetitor[]) ?? []).slice(0, 5)
      .map((c) => `<li>${esc(c.domain)} — ${c.organicKeywords} keywords</li>`).join("");
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gap analysis — ${esc(run.competitorDomain)}</title></head>
<body style="margin:0;background:#020817;color:#e6edf6;font-family:system-ui,Segoe UI,sans-serif">
<div style="max-width:720px;margin:0 auto;padding:32px 20px">
  <div style="border:1px solid rgba(255,255,255,0.1);border-radius:16px;background:rgba(255,255,255,0.03);padding:28px;box-shadow:0 0 32px rgba(0,132,255,0.12)">
    <h1 style="margin:0 0 4px;font-size:18px;color:#fff">🔍 Análisis de brechas competitivas</h1>
    <p style="color:#7a8aa0;font-size:13px;margin:0 0 18px">${esc(run.ownDomain)} <span style="color:#0084ff">vs</span> ${esc(run.competitorDomain)}</p>
    <div style="display:flex;gap:16px;margin-bottom:20px">
      <div style="flex:1;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px">
        <div style="color:#7a8aa0;font-size:11px;text-transform:uppercase">Gap score</div>
        <div style="font-size:26px;font-weight:700;color:${(run.gapScore ?? 0) >= 50 ? "#ef4444" : "#f59e0b"}">${run.gapScore ?? 0}</div>
      </div>
      <div style="flex:2;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px">
        <div style="color:#7a8aa0;font-size:11px;text-transform:uppercase">Pack recomendado</div>
        <div style="font-size:16px;font-weight:600;color:#0084ff">${esc(run.recommendedPackId ?? "—")}</div>
        <div style="color:#7a8aa0;font-size:11px">${esc(run.recommendedSkus.join(", "))}</div>
      </div>
    </div>
    <h2 style="font-size:13px;color:#7a8aa0;text-transform:uppercase;margin:0 0 8px">Brechas detectadas</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">${gapRows || '<tr><td style="padding:8px 12px;color:#7a8aa0">Sin brechas significativas</td></tr>'}</table>
    ${kws ? `<h2 style="font-size:13px;color:#7a8aa0;text-transform:uppercase;margin:18px 0 8px">Competidores</h2><ul style="color:#e6edf6;font-size:13px;margin:0;padding-left:18px">${kws}</ul>` : ""}
    <p style="margin:22px 0 0;color:#7a8aa0;font-size:11px;text-align:center">Generado por Nelvyon OS · proveedor de datos: ${esc(run.agentData.provider ?? "none")}</p>
  </div>
</div></body></html>`;
  }

  async failRun(runId: string, error: string): Promise<CompetitorGapRun> {
    const rows = await this.db.query<GapRow>(
      `UPDATE os_competitor_gap_runs SET status = 'failed', error_message = $2, completed_at = NOW() WHERE id = $1 RETURNING *`,
      [runId, error],
    );
    if (!rows[0]) throw new OsCompetitorGapError("NOT_FOUND", `Gap run ${runId} no encontrado`);
    return rowToRun(rows[0]);
  }

  /** Launch (or stage) the recommended pack via Brief-to-Launch. */
  async launchRecommendedPack(runId: string, opts: { userId?: string; execute?: boolean } = {}): Promise<CompetitorGapRun> {
    const run = await this.getRun(runId);
    if (!run.recommendedPackId) {
      throw new OsCompetitorGapError("VALIDATION", "Run sin pack recomendado — ejecuta analyze primero");
    }
    if (!opts.execute) return run;

    const brief = buildBriefPatch(run.ownDomain, run.competitorUrl, run.gaps, run.agentData);
    if (run.tenantId) brief.tenant_id = run.tenantId;
    const { launchId, packRunId } = await this.launches.suggestLaunch({
      packId: run.recommendedPackId, brief, userId: opts.userId, execute: true,
    });
    const rows = await this.db.query<GapRow>(
      `UPDATE os_competitor_gap_runs SET launch_id = $2::uuid, pack_run_id = $3::uuid WHERE id = $1 RETURNING *`,
      [runId, launchId, packRunId],
    );
    return rowToRun(rows[0]!, true);
  }

  async getRun(id: string): Promise<CompetitorGapRun> {
    const rows = await this.db.query<GapRow>(`SELECT * FROM os_competitor_gap_runs WHERE id = $1`, [id]);
    if (!rows[0]) throw new OsCompetitorGapError("NOT_FOUND", `Gap run ${id} no encontrado`);
    return rowToRun(rows[0], true);
  }

  async listRuns(limit = 50): Promise<CompetitorGapRun[]> {
    const rows = await this.db.query<GapRow>(
      `SELECT * FROM os_competitor_gap_runs ORDER BY started_at DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map((r) => rowToRun(r, false));
  }

  async getSummary(): Promise<GapSummary> {
    const rows = await this.db.query<{ total: string; completed: string; avg_score: string | null }>(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='completed') AS completed,
              AVG(gap_score) FILTER (WHERE status='completed') AS avg_score
       FROM os_competitor_gap_runs`,
    );
    let topRecommendedPack: string | null = null;
    try {
      const top = await this.db.query<{ recommended_pack_id: string }>(
        `SELECT recommended_pack_id FROM os_competitor_gap_runs
         WHERE recommended_pack_id IS NOT NULL
         GROUP BY recommended_pack_id ORDER BY COUNT(*) DESC LIMIT 1`,
      );
      topRecommendedPack = top[0]?.recommended_pack_id ?? null;
    } catch { /* ignore */ }
    const r = rows[0];
    return {
      total: parseInt(r?.total ?? "0", 10),
      completed: parseInt(r?.completed ?? "0", 10),
      avgGapScore: r?.avg_score ? Math.round(parseFloat(r.avg_score)) : 0,
      topRecommendedPack,
    };
  }
}
