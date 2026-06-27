/**
 * O18 — OsVisualQaGateService
 * Unified pre-publish QA gate: visual score + Lighthouse proxy + content-hash diff
 * vs baseline + EU legal block. Persists an audit trail per run and enforces hard
 * thresholds — no silent bypass. Lighthouse is a structural proxy in v1 (real PSI
 * optional via GOOGLE_PSI_API_KEY).
 */
import { createHash } from "node:crypto";
import { runVisualQa, type VisualQaInput, type VisualQaResult } from "./visualQaEngine";

export type QaDbPort = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
};

// ── Thresholds ───────────────────────────────────────────────────────────────────

export const MIN_VISUAL_SCORE = 85;
export const MIN_LIGHTHOUSE = 90;
export const MAX_DIFF_PERCENT = 5;

// ── Types ───────────────────────────────────────────────────────────────────────

export type GateStatus = "pending" | "passed" | "failed" | "blocked";

export type GateInput = VisualQaInput & {
  packRunId?: string;
  deliverableRef?: string;
  tenantId?: string;
  workspaceId?: number;
  baselineHtml?: string;
};

export type GateResult = {
  gateStatus: GateStatus;
  visualScore: number;
  lighthouseScore: number;
  legalPassed: boolean;
  contentHash: string | null;
  baselineHash: string | null;
  diffPercent: number | null;
  failureReasons: string[];
  checks: VisualQaResult["checks"];
};

export type QaAuditRun = GateResult & {
  id: string;
  packRunId: string | null;
  deliverableRef: string | null;
  createdAt: string;
};

export type GateSummary = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  passRate: number;
  avgVisual: number;
  avgLighthouse: number;
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsVisualQaGateService | null = null;

export function getOsVisualQaGateService(): OsVisualQaGateService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../../db/DbClient") as { DbClient: { getInstance(): QaDbPort } };
    _instance = new OsVisualQaGateService(DbClient.getInstance());
  }
  return _instance;
}

export function resetOsVisualQaGateServiceForTests(): void {
  _instance = null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function normalize(html: string): string {
  return html.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Bounded Levenshtein (caps inputs to keep it O(n*m) small). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const s = a.slice(0, 4000);
  const t = b.slice(0, 4000);
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsVisualQaGateService {
  constructor(private readonly db: QaDbPort) {}

  /** SHA-256 of whitespace-normalized HTML. */
  computeContentHash(html: string): string {
    return createHash("sha256").update(normalize(html)).digest("hex");
  }

  /** Structural+contrast proxy for a Lighthouse mobile score (0–100). v1 heuristic. */
  computeLighthouseProxy(input: VisualQaInput): number {
    const qa = runVisualQa(input);
    // structural max 40 (15+15+10), contrast max 35 → weight 50/50 into 0–100
    const structural = Math.min(qa.checks.structural_score, 40);
    const contrast = Math.min(qa.checks.contrast_score, 35);
    const proxy = (structural / 40) * 50 + (contrast / 35) * 50;
    return Math.max(0, Math.min(100, Math.round(proxy)));
  }

  /** Percentage difference between two HTML strings (0 = identical, 100 = fully different). */
  diffPercent(current: string, baseline: string): number {
    const a = normalize(current);
    const b = normalize(baseline);
    if (a === b) return 0;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length) || 1;
    return Math.round((dist / maxLen) * 10000) / 100;
  }

  /** Run the full gate. Hard-blocks on legal; fails on visual/lighthouse/diff thresholds. */
  runGate(input: GateInput): GateResult {
    const qa = runVisualQa(input);
    const lighthouse = this.computeLighthouseProxy(input);

    const contentHash = input.landingHtml ? this.computeContentHash(input.landingHtml) : null;
    let baselineHash: string | null = null;
    let diffPercent: number | null = null;
    if (input.landingHtml && input.baselineHtml) {
      baselineHash = this.computeContentHash(input.baselineHtml);
      diffPercent = this.diffPercent(input.landingHtml, input.baselineHtml);
    }

    const failureReasons: string[] = [];
    if (!qa.legal_passed) {
      failureReasons.push(`Legal: términos prohibidos (${qa.checks.prohibited_terms.join(", ")})`);
    }
    if (qa.score < MIN_VISUAL_SCORE) failureReasons.push(`Visual score ${qa.score} < ${MIN_VISUAL_SCORE}`);
    if (lighthouse < MIN_LIGHTHOUSE) failureReasons.push(`Lighthouse proxy ${lighthouse} < ${MIN_LIGHTHOUSE}`);
    if (diffPercent !== null && diffPercent > MAX_DIFF_PERCENT) {
      failureReasons.push(`Diff ${diffPercent}% > ${MAX_DIFF_PERCENT}%`);
    }

    let gateStatus: GateStatus;
    if (!qa.legal_passed) gateStatus = "blocked";
    else if (failureReasons.length > 0) gateStatus = "failed";
    else gateStatus = "passed";

    return {
      gateStatus,
      visualScore: qa.score,
      lighthouseScore: lighthouse,
      legalPassed: qa.legal_passed,
      contentHash,
      baselineHash,
      diffPercent,
      failureReasons,
      checks: qa.checks,
    };
  }

  async saveAuditRun(
    result: GateResult,
    meta: { packRunId?: string | null; deliverableRef?: string | null; tenantId?: string | null; workspaceId?: number | null },
  ): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO os_qa_audit_runs
         (pack_run_id, deliverable_ref, tenant_id, workspace_id, visual_score, lighthouse_score,
          legal_passed, content_hash, baseline_hash, diff_percent, gate_status, failure_reasons, checks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)
       RETURNING id`,
      [
        meta.packRunId ?? null,
        meta.deliverableRef ?? null,
        meta.tenantId ?? null,
        meta.workspaceId ?? null,
        result.visualScore,
        result.lighthouseScore,
        result.legalPassed,
        result.contentHash,
        result.baselineHash,
        result.diffPercent,
        result.gateStatus,
        JSON.stringify(result.failureReasons),
        JSON.stringify(result.checks),
      ],
    );
    return rows[0]!.id;
  }

  /** Run the gate AND persist the audit row (used by the orchestrator hook). */
  async runAndPersist(input: GateInput): Promise<GateResult & { auditId: string | null }> {
    const result = this.runGate(input);
    let auditId: string | null = null;
    try {
      auditId = await this.saveAuditRun(result, {
        packRunId: input.packRunId ?? null,
        deliverableRef: input.deliverableRef ?? null,
        tenantId: input.tenantId ?? null,
        workspaceId: input.workspaceId ?? null,
      });
    } catch { /* audit persistence is best-effort */ }
    return { ...result, auditId };
  }

  async listAuditRuns(filters: { packRunId?: string; gateStatus?: GateStatus; limit?: number } = {}): Promise<QaAuditRun[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.packRunId) { conditions.push(`pack_run_id = $${idx++}`); params.push(filters.packRunId); }
    if (filters.gateStatus) { conditions.push(`gate_status = $${idx++}`); params.push(filters.gateStatus); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);

    const rows = await this.db.query<{
      id: string; pack_run_id: string | null; deliverable_ref: string | null;
      visual_score: number; lighthouse_score: number | null; legal_passed: boolean;
      content_hash: string | null; baseline_hash: string | null; diff_percent: string | null;
      gate_status: GateStatus; failure_reasons: string[]; checks: VisualQaResult["checks"]; created_at: string;
    }>(
      `SELECT * FROM os_qa_audit_runs ${where} ORDER BY created_at DESC LIMIT $${idx}`,
      [...params, limit],
    );
    return rows.map((r) => ({
      id: r.id,
      packRunId: r.pack_run_id,
      deliverableRef: r.deliverable_ref,
      visualScore: r.visual_score,
      lighthouseScore: r.lighthouse_score ?? 0,
      legalPassed: r.legal_passed,
      contentHash: r.content_hash,
      baselineHash: r.baseline_hash,
      diffPercent: r.diff_percent !== null ? parseFloat(r.diff_percent) : null,
      gateStatus: r.gate_status,
      failureReasons: r.failure_reasons ?? [],
      checks: r.checks,
      createdAt: r.created_at,
    }));
  }

  async getGateSummary(): Promise<GateSummary> {
    const rows = await this.db.query<{
      gate_status: GateStatus; count: string; avg_visual: string | null; avg_lh: string | null;
    }>(
      `SELECT gate_status, COUNT(*) AS count,
              AVG(visual_score) AS avg_visual, AVG(lighthouse_score) AS avg_lh
       FROM os_qa_audit_runs
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY gate_status`,
    );
    let total = 0, passed = 0, failed = 0, blocked = 0, visualSum = 0, lhSum = 0;
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      total += n;
      if (r.gate_status === "passed") passed += n;
      if (r.gate_status === "failed") failed += n;
      if (r.gate_status === "blocked") blocked += n;
      visualSum += (parseFloat(r.avg_visual ?? "0") || 0) * n;
      lhSum += (parseFloat(r.avg_lh ?? "0") || 0) * n;
    }
    return {
      total,
      passed,
      failed,
      blocked,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgVisual: total > 0 ? Math.round(visualSum / total) : 0,
      avgLighthouse: total > 0 ? Math.round(lhSum / total) : 0,
    };
  }
}
