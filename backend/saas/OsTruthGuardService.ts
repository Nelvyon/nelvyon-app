/**
 * O30 — OsTruthGuardService
 * Unified deterministic pre-publish rules for landing, email, and ads copy.
 * Reuses O27 scanClaims + O18 legal slice — no LLM, no legal advice.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { scanClaims } from "./OsRegulatedSectorShieldService";

// ── Constants ───────────────────────────────────────────────────────────────────

export const DECEPTIVE_SUBJECT_PATTERNS: RegExp[] = [
  /\b(RE:\s*)?(ganaste|has\s+ganado|felicidades\s+ganador)\b/i,
  /\bURGENTE\s*[:\-!]/i,
  /\b100\s*%\s*gratis\b/i,
  /\b(act[uú]a\s+ya|[uú]ltima\s+oportunidad)\b/i,
  /\b(ganador\s+seleccionado|premio\s+sin\s+solicitar)\b/i,
];

export const ADS_MIN_HEADLINE_LEN = 5;
export const ADS_MIN_DESCRIPTION_LEN = 10;

// ── Ports ───────────────────────────────────────────────────────────────────────

export type TruthClaimsPort = { scan(text: string): { ok: boolean; violations: string[] } };
export type TruthLegalPort = { runLegal(text: string): Promise<{ ok: boolean; terms: string[] }> };

// ── Types ───────────────────────────────────────────────────────────────────────

export type TruthChannel = "landing" | "email" | "ads";
export type TruthStatus = "pending" | "passed" | "warning" | "blocked";
export type TruthCheck = { name: string; ok: boolean; detail?: string };

export type TruthAuditResult = {
  id?: string;
  channel: TruthChannel;
  status: TruthStatus;
  claimsOk: boolean;
  legalOk: boolean;
  channelOk: boolean;
  violations: string[];
  checks: TruthCheck[];
  contentPreview: string | null;
  packRunId?: string | null;
  deliverableRef?: string | null;
  campaniaId?: string | null;
  tenantId?: string | null;
  workspaceId?: number | null;
  sectorId?: string | null;
  metadata: Record<string, unknown>;
};

export type TruthSummary = {
  total: number;
  blocked: number;
  passed: number;
  warning: number;
  byChannel: Record<TruthChannel, number>;
  topViolations: Array<{ violation: string; count: number }>;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────────

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function evaluateClaims(text: string, scanFn: TruthClaimsPort["scan"] = scanClaims): { ok: boolean; violations: string[] } {
  return scanFn(normalizeText(text));
}

export function evaluateEmailSubject(subject: string): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const s = normalizeText(subject);
  for (const re of DECEPTIVE_SUBJECT_PATTERNS) {
    const m = s.match(re);
    if (m) violations.push(m[0].trim());
  }
  return { ok: violations.length === 0, violations };
}

export function evaluateAdsCopy(headline: string, description: string): { ok: boolean; violations: string[]; checks: TruthCheck[] } {
  const h = normalizeText(headline);
  const d = normalizeText(description);
  const checks: TruthCheck[] = [
    { name: "headline_length", ok: h.length >= ADS_MIN_HEADLINE_LEN, detail: `min ${ADS_MIN_HEADLINE_LEN} chars` },
    { name: "description_length", ok: d.length >= ADS_MIN_DESCRIPTION_LEN, detail: `min ${ADS_MIN_DESCRIPTION_LEN} chars` },
  ];
  const violations: string[] = [];
  if (!checks[0]!.ok) violations.push("headline demasiado corto");
  if (!checks[1]!.ok) violations.push("description demasiado corta");
  return { ok: violations.length === 0, violations, checks };
}

export function computeTruthStatus(input: {
  channel: TruthChannel;
  claimsOk: boolean;
  legalOk: boolean;
  channelOk: boolean;
}): TruthStatus {
  if (!input.claimsOk || !input.channelOk) return "blocked";
  if (!input.legalOk) {
    return input.channel === "ads" ? "warning" : "blocked";
  }
  return "passed";
}

function preview(text: string, max = 240): string {
  const t = normalizeText(text);
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type AuditRow = {
  id: string;
  channel: TruthChannel;
  pack_run_id: string | null;
  deliverable_ref: string | null;
  campania_id: string | null;
  tenant_id: string | null;
  workspace_id: number | null;
  sector_id: string | null;
  status: TruthStatus;
  claims_ok: boolean;
  legal_ok: boolean;
  channel_ok: boolean;
  violations: string[];
  checks: TruthCheck[];
  content_preview: string | null;
  metadata: Record<string, unknown>;
  audited_at: string;
};

function rowToAudit(r: AuditRow): TruthAuditResult & { auditedAt: string } {
  return {
    id: r.id,
    channel: r.channel,
    status: r.status,
    claimsOk: r.claims_ok,
    legalOk: r.legal_ok,
    channelOk: r.channel_ok,
    violations: r.violations ?? [],
    checks: r.checks ?? [],
    contentPreview: r.content_preview,
    packRunId: r.pack_run_id,
    deliverableRef: r.deliverable_ref,
    campaniaId: r.campania_id,
    tenantId: r.tenant_id,
    workspaceId: r.workspace_id,
    sectorId: r.sector_id,
    metadata: r.metadata ?? {},
    auditedAt: r.audited_at,
  };
}

// ── Default ports ────────────────────────────────────────────────────────────────

const defaultClaimsPort: TruthClaimsPort = { scan: scanClaims };

const defaultLegalPort: TruthLegalPort = {
  async runLegal(text) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { runVisualQa } = require("../autonomous/qa/visualQaEngine") as {
        runVisualQa: (i: { copyText?: string }) => { legal_passed: boolean; checks: { prohibited_terms: string[] } };
      };
      const r = runVisualQa({ copyText: text });
      return { ok: r.legal_passed, terms: r.checks.prohibited_terms ?? [] };
    } catch {
      return { ok: true, terms: [] };
    }
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsTruthGuardService | null = null;

export function getOsTruthGuardService(): OsTruthGuardService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsTruthGuardService(DbClient.getInstance(), defaultClaimsPort, defaultLegalPort);
  }
  return _instance;
}

export function resetOsTruthGuardServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsTruthGuardService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly claims: TruthClaimsPort = defaultClaimsPort,
    private readonly legal: TruthLegalPort = defaultLegalPort,
  ) {}

  async evaluate(input: {
    channel: TruthChannel;
    text: string;
    subject?: string;
    headline?: string;
    description?: string;
    sectorId?: string | null;
    packRunId?: string | null;
    deliverableRef?: string | null;
    campaniaId?: string | null;
    tenantId?: string | null;
    workspaceId?: number | null;
    metadata?: Record<string, unknown>;
  }): Promise<TruthAuditResult> {
    const checks: TruthCheck[] = [];
    let violations: string[] = [];
    let channelOk = true;

    const body = normalizeText(input.text ?? "");
    const subject = normalizeText(input.subject ?? "");
    let combined = body;

    if (input.channel === "email") {
      const subjectCheck = evaluateEmailSubject(subject || input.text.slice(0, 80));
      checks.push({
        name: "email_subject",
        ok: subjectCheck.ok,
        detail: subjectCheck.ok ? "subject ok" : "subject engañoso",
      });
      if (!subjectCheck.ok) {
        channelOk = false;
        violations = [...violations, ...subjectCheck.violations];
      }
      combined = normalizeText(`${subject} ${body}`);
    }

    if (input.channel === "ads") {
      const ads = evaluateAdsCopy(input.headline ?? "", input.description ?? input.text);
      checks.push(...ads.checks);
      if (!ads.ok) {
        channelOk = false;
        violations = [...violations, ...ads.violations];
      }
      combined = normalizeText(`${input.headline ?? ""} ${input.description ?? ""} ${body}`);
    }

    const claims = evaluateClaims(combined, this.claims.scan);
    checks.push({
      name: "claims",
      ok: claims.ok,
      detail: claims.ok ? "sin claims prohibidos" : `${claims.violations.length} violaciones`,
    });
    if (!claims.ok) violations = [...new Set([...violations, ...claims.violations])];

    let legalOk = true;
    try {
      const legal = await this.legal.runLegal(combined);
      legalOk = legal.ok;
      checks.push({
        name: "legal",
        ok: legal.ok,
        detail: legal.ok ? "legal ok" : `${legal.terms.length} términos prohibidos`,
      });
      if (!legal.ok) violations = [...new Set([...violations, ...legal.terms])];
    } catch {
      checks.push({ name: "legal", ok: true, detail: "legal skip" });
    }

    const status = computeTruthStatus({
      channel: input.channel,
      claimsOk: claims.ok,
      legalOk,
      channelOk,
    });

    return {
      channel: input.channel,
      status,
      claimsOk: claims.ok,
      legalOk,
      channelOk,
      violations,
      checks,
      contentPreview: preview(combined),
      packRunId: input.packRunId ?? null,
      deliverableRef: input.deliverableRef ?? null,
      campaniaId: input.campaniaId ?? null,
      tenantId: input.tenantId ?? null,
      workspaceId: input.workspaceId ?? null,
      sectorId: input.sectorId ?? null,
      metadata: input.metadata ?? {},
    };
  }

  async persistAudit(result: TruthAuditResult): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO os_truth_guard_audits
         (channel, pack_run_id, deliverable_ref, campania_id, tenant_id, workspace_id, sector_id,
          status, claims_ok, legal_ok, channel_ok, violations, checks, content_preview, metadata)
       VALUES ($1,$2::uuid,$3,$4::uuid,$5::uuid,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15::jsonb)
       RETURNING id`,
      [
        result.channel,
        result.packRunId,
        result.deliverableRef,
        result.campaniaId,
        result.tenantId,
        result.workspaceId,
        result.sectorId,
        result.status,
        result.claimsOk,
        result.legalOk,
        result.channelOk,
        JSON.stringify(result.violations),
        JSON.stringify(result.checks),
        result.contentPreview,
        JSON.stringify(result.metadata),
      ],
    );
    return rows[0]!.id;
  }

  async evaluateAndPersist(input: Parameters<OsTruthGuardService["evaluate"]>[0]): Promise<TruthAuditResult> {
    const result = await this.evaluate(input);
    try {
      result.id = await this.persistAudit(result);
    } catch {
      /* audit best-effort */
    }
    return result;
  }

  canPublish(_channel: TruthChannel, metadata: Record<string, unknown>): { allowed: boolean; reason?: string } {
    if (metadata?.truth_status === "blocked") {
      return { allowed: false, reason: "Truth guard bloqueado: copy no cumple reglas pre-publish" };
    }
    return { allowed: true };
  }

  async listAudits(filters: {
    channel?: TruthChannel;
    status?: TruthStatus;
    packRunId?: string;
    limit?: number;
  } = {}): Promise<Array<TruthAuditResult & { auditedAt: string }>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.channel) {
      conditions.push(`channel = $${idx++}`);
      params.push(filters.channel);
    }
    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.packRunId) {
      conditions.push(`pack_run_id = $${idx++}::uuid`);
      params.push(filters.packRunId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await this.db.query<AuditRow>(
      `SELECT * FROM os_truth_guard_audits ${where} ORDER BY audited_at DESC LIMIT $${idx}`,
      [...params, Math.min(Math.max(filters.limit ?? 50, 1), 200)],
    );
    return rows.map(rowToAudit);
  }

  async getSummary(): Promise<TruthSummary> {
    const rows = await this.db.query<{ status: TruthStatus; count: string }>(
      `SELECT status, COUNT(*) AS count FROM os_truth_guard_audits GROUP BY status`,
    );
    const byChannelRows = await this.db.query<{ channel: TruthChannel; count: string }>(
      `SELECT channel, COUNT(*) AS count FROM os_truth_guard_audits GROUP BY channel`,
    ).catch(() => [] as Array<{ channel: TruthChannel; count: string }>);

    const summary: TruthSummary = {
      total: 0,
      blocked: 0,
      passed: 0,
      warning: 0,
      byChannel: { landing: 0, email: 0, ads: 0 },
      topViolations: [],
    };
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      summary.total += n;
      if (r.status === "blocked") summary.blocked += n;
      if (r.status === "passed") summary.passed += n;
      if (r.status === "warning") summary.warning += n;
    }
    for (const r of byChannelRows) {
      summary.byChannel[r.channel] = parseInt(r.count, 10);
    }
    try {
      const v = await this.db.query<{ violation: string; count: string }>(
        `SELECT violation, COUNT(*) AS count
         FROM os_truth_guard_audits, jsonb_array_elements_text(violations) AS violation
         GROUP BY violation ORDER BY count DESC LIMIT 5`,
      );
      summary.topViolations = v.map((x) => ({ violation: x.violation, count: parseInt(x.count, 10) }));
    } catch {
      /* ignore */
    }
    return summary;
  }
}
