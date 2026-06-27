/**
 * O27 — OsRegulatedSectorShieldService
 * Enforces EU compliance for regulated sectors: mandatory disclaimer + prohibited
 * claims scan, blocking portal publication when a regulated deliverable fails. v1
 * uses fixed Spanish disclaimer templates + a deterministic claims regex set — no
 * external legal advice. Standalone + audit log + portal gate.
 *
 * Ports injectable so vitest never hits sector registry / QA; prod lazy-loads.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── EU disclaimer library (v1, ES) ───────────────────────────────────────────────

export const EU_DISCLAIMERS: Record<string, string> = {
  dental: "Información orientativa, no sustituye el diagnóstico de un profesional sanitario colegiado. Resultados individuales pueden variar.",
  legal: "Contenido informativo general, no constituye asesoramiento jurídico vinculante. Consulta con un abogado colegiado para tu caso concreto.",
  beauty: "Tratamientos estéticos sujetos a valoración profesional. La información no sustituye una consulta médica. Resultados variables.",
  solar: "Estimaciones orientativas de ahorro energético. Sujeto a estudio técnico individual y normativa vigente. No garantiza rentabilidad.",
  seguros: "Información no contractual. Las coberturas y condiciones están sujetas a la póliza y a la valoración de la aseguradora.",
  contabilidad: "Contenido informativo, no constituye asesoramiento fiscal personalizado. Consulta con un asesor colegiado para tu situación.",
  medical: "Información de salud orientativa, no sustituye el criterio de un profesional sanitario. No realizamos diagnósticos online.",
  pharmacy: "Información no sustituye el consejo farmacéutico ni la prescripción médica. Lea las instrucciones de cada producto.",
  finance: "Información general, no constituye recomendación de inversión. Rentabilidades pasadas no garantizan rentabilidades futuras.",
};

// Phrases (normalized, lowercase) that identify the required disclaimer per sector.
const DISCLAIMER_KEYPHRASES: Record<string, string[]> = {
  dental: ["no sustituye", "profesional sanitario"],
  legal: ["no constituye asesoramiento", "abogado"],
  beauty: ["valoracion profesional", "no sustituye"],
  solar: ["estimaciones", "no garantiza"],
  seguros: ["no contractual", "poliza"],
  contabilidad: ["no constituye asesoramiento", "asesor"],
  medical: ["no sustituye", "profesional sanitario"],
  pharmacy: ["consejo farmaceutico", "no sustituye"],
  finance: ["no constituye recomendacion", "rentabilidades pasadas"],
};

// ── Prohibited claims (EU advertising / health / finance / legal) ─────────────────

export const PROHIBITED_CLAIMS: RegExp[] = [
  /\b(cura(ci[oó]n)?\s+garantizada)\b/i,
  /\b100\s*%\s*(de\s+)?(resultados?|efectiv[oa]|garantizad[oa])\b/i,
  /\b(resultados?\s+garantizados?)\b/i,
  /\b(sin\s+riesgo\s+alguno|riesgo\s+cero)\b/i,
  /\b(rentabilidad|ganancias?)\s+garantizadas?\b/i,
  /\b(duplica|triplica)\s+tu\s+(dinero|inversi[oó]n)\b/i,
  /\b(asesoramiento\s+(legal\s+)?vinculante)\b/i,
  /\b(curamos|eliminamos)\s+(el|la|tu)\b.*\b(enfermedad|c[aá]ncer|dolor\s+para\s+siempre)\b/i,
  /\b(milagros[oa]|infalible)\b/i,
  /\b(garantizamos?\s+(que\s+)?(siempre|nunca|el\s+\d+))\b/i,
];

// ── Ports ───────────────────────────────────────────────────────────────────────

export type SectorPort = { isRegulated(sectorId: string): Promise<boolean> };
export type QaPort = { runVisualLegal(text: string): Promise<{ legal_passed: boolean; prohibited_terms: string[] }> };

// ── Types ───────────────────────────────────────────────────────────────────────

export type ShieldStatus = "pending" | "passed" | "blocked" | "warning";
export type ShieldCheck = { name: string; ok: boolean; detail?: string };

export type ShieldAuditResult = {
  id?: string;
  sectorId: string;
  packRunId: string | null;
  deliverableRef: string | null;
  status: ShieldStatus;
  regulated: boolean;
  disclaimerOk: boolean;
  claimsOk: boolean;
  disclaimerText: string | null;
  claimsViolations: string[];
  checks: ShieldCheck[];
  metadata: Record<string, unknown>;
};

export type ShieldSummary = {
  total: number;
  blocked: number;
  passed: number;
  warning: number;
  regulatedAudits: number;
  topViolations: Array<{ violation: string; count: number }>;
};

export type OsShieldErrorCode = "NOT_FOUND";
export class OsShieldError extends Error {
  constructor(public readonly code: OsShieldErrorCode, message: string) {
    super(message);
    this.name = "OsShieldError";
  }
}

// ── Pure helpers (exported for tests) ────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function scanClaims(text: string): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const re of PROHIBITED_CLAIMS) {
    const m = text.match(re);
    if (m) violations.push(m[0].trim());
  }
  return { ok: violations.length === 0, violations };
}

export function hasRequiredDisclaimer(text: string, sectorId: string): boolean {
  const phrases = DISCLAIMER_KEYPHRASES[sectorId];
  if (!phrases) return true; // no specific disclaimer required for this sector
  const norm = normalize(text);
  // require at least one key phrase from the sector's disclaimer to be present
  return phrases.some((p) => norm.includes(normalize(p)));
}

export function computeShieldStatus(input: { regulated: boolean; disclaimerOk: boolean; claimsOk: boolean }): ShieldStatus {
  if (input.regulated) {
    if (!input.disclaimerOk || !input.claimsOk) return "blocked";
    return "passed";
  }
  // non-regulated: claims failure is a warning, never a hard block
  if (!input.claimsOk) return "warning";
  return "passed";
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type AuditRow = {
  id: string; pack_run_id: string | null; deliverable_ref: string | null; sector_id: string;
  status: ShieldStatus; regulated: boolean; disclaimer_ok: boolean; claims_ok: boolean;
  disclaimer_text: string | null; claims_violations: string[]; checks: ShieldCheck[];
  metadata: Record<string, unknown>; audited_at: string;
};

function rowToAudit(r: AuditRow): ShieldAuditResult & { auditedAt: string } {
  return {
    id: r.id, sectorId: r.sector_id, packRunId: r.pack_run_id, deliverableRef: r.deliverable_ref,
    status: r.status, regulated: r.regulated, disclaimerOk: r.disclaimer_ok, claimsOk: r.claims_ok,
    disclaimerText: r.disclaimer_text, claimsViolations: r.claims_violations ?? [],
    checks: r.checks ?? [], metadata: r.metadata ?? {}, auditedAt: r.audited_at,
  };
}

// ── Default ports ────────────────────────────────────────────────────────────────

const REGULATED_SECTORS = new Set(["dental", "legal", "beauty", "solar", "seguros", "contabilidad", "medical", "pharmacy", "finance", "salud", "clinica"]);

const defaultSectorPort: SectorPort = {
  async isRegulated(sectorId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SECTOR_REGISTRY } = require("../autonomous/sectors/sectorRegistry") as {
        SECTOR_REGISTRY: Record<string, { regulated?: boolean }>;
      };
      const profile = SECTOR_REGISTRY[sectorId];
      if (profile) return !!profile.regulated;
    } catch { /* fall through to static set */ }
    return REGULATED_SECTORS.has(sectorId);
  },
};

const defaultQaPort: QaPort = {
  async runVisualLegal(text) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { runVisualQa } = require("../autonomous/qa/visualQaEngine") as {
        runVisualQa: (i: { copyText?: string }) => { legal_passed: boolean; checks: { prohibited_terms: string[] } };
      };
      const r = runVisualQa({ copyText: text });
      return { legal_passed: r.legal_passed, prohibited_terms: r.checks.prohibited_terms };
    } catch {
      return { legal_passed: true, prohibited_terms: [] };
    }
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsRegulatedSectorShieldService | null = null;

export function getOsRegulatedSectorShieldService(): OsRegulatedSectorShieldService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsRegulatedSectorShieldService(DbClient.getInstance(), defaultSectorPort, defaultQaPort);
  }
  return _instance;
}

export function resetOsRegulatedSectorShieldServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsRegulatedSectorShieldService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly sectors: SectorPort = defaultSectorPort,
    private readonly qa: QaPort = defaultQaPort,
  ) {}

  disclaimerFor(sectorId: string): string | null {
    return EU_DISCLAIMERS[sectorId] ?? null;
  }

  /** Evaluate disclaimer + claims for a piece of content (no persistence). */
  async evaluateShield(input: { sectorId: string; packRunId?: string | null; deliverableRef?: string | null; htmlOrText: string; metadata?: Record<string, unknown> }): Promise<ShieldAuditResult> {
    const text = input.htmlOrText ?? "";
    const regulated = await this.sectors.isRegulated(input.sectorId).catch(() => false);

    const claimsLocal = scanClaims(text);
    let claimsViolations = claimsLocal.violations;
    // fold in the visual QA legal slice (best-effort) for extra coverage
    try {
      const qa = await this.qa.runVisualLegal(text);
      if (!qa.legal_passed) claimsViolations = [...new Set([...claimsViolations, ...qa.prohibited_terms])];
    } catch { /* qa optional */ }
    const claimsOk = claimsViolations.length === 0;

    const disclaimerOk = regulated ? hasRequiredDisclaimer(text, input.sectorId) : true;
    const status = computeShieldStatus({ regulated, disclaimerOk, claimsOk });
    const disclaimerText = this.disclaimerFor(input.sectorId);

    const checks: ShieldCheck[] = [
      { name: "regulated", ok: true, detail: regulated ? "sector regulado" : "no regulado" },
      { name: "disclaimer", ok: disclaimerOk, detail: disclaimerOk ? "presente/n.a." : "falta disclaimer EU" },
      { name: "claims", ok: claimsOk, detail: claimsOk ? "sin claims prohibidos" : `${claimsViolations.length} violaciones` },
    ];

    return {
      sectorId: input.sectorId,
      packRunId: input.packRunId ?? null,
      deliverableRef: input.deliverableRef ?? null,
      status,
      regulated,
      disclaimerOk,
      claimsOk,
      disclaimerText,
      claimsViolations,
      checks,
      metadata: input.metadata ?? {},
    };
  }

  async persistAudit(result: ShieldAuditResult): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO os_sector_shield_audits
         (pack_run_id, deliverable_ref, sector_id, status, regulated, disclaimer_ok, claims_ok,
          disclaimer_text, claims_violations, checks, metadata)
       VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb)
       RETURNING id`,
      [
        result.packRunId, result.deliverableRef, result.sectorId, result.status, result.regulated,
        result.disclaimerOk, result.claimsOk, result.disclaimerText,
        JSON.stringify(result.claimsViolations), JSON.stringify(result.checks), JSON.stringify(result.metadata),
      ],
    );
    return rows[0]!.id;
  }

  async evaluateAndPersist(input: { sectorId: string; packRunId?: string | null; deliverableRef?: string | null; htmlOrText: string; metadata?: Record<string, unknown> }): Promise<ShieldAuditResult> {
    const result = await this.evaluateShield(input);
    try { result.id = await this.persistAudit(result); } catch { /* audit best-effort */ }
    return result;
  }

  /** Portal gate: regulated + shield blocked → not publishable. */
  async canPublishToPortal(sectorId: string, metadata: Record<string, unknown>): Promise<{ allowed: boolean; reason?: string }> {
    if (metadata?.shield_status === "blocked") {
      return { allowed: false, reason: "Shield bloqueado: disclaimer EU o claims prohibidos en sector regulado" };
    }
    const regulated = await this.sectors.isRegulated(sectorId).catch(() => false);
    if (!regulated) return { allowed: true };
    // Regulated: require an explicit non-blocked shield signal when present.
    if (metadata?.shield_status && metadata.shield_status !== "passed" && metadata.shield_status !== "warning") {
      return { allowed: false, reason: "Sector regulado sin shield aprobado" };
    }
    return { allowed: true };
  }

  async listAudits(filters: { sectorId?: string; status?: ShieldStatus; limit?: number } = {}): Promise<Array<ShieldAuditResult & { auditedAt: string }>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.sectorId) { conditions.push(`sector_id = $${idx++}`); params.push(filters.sectorId); }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await this.db.query<AuditRow>(
      `SELECT * FROM os_sector_shield_audits ${where} ORDER BY audited_at DESC LIMIT $${idx}`,
      [...params, Math.min(Math.max(filters.limit ?? 50, 1), 200)],
    );
    return rows.map(rowToAudit);
  }

  async getSummary(): Promise<ShieldSummary> {
    const rows = await this.db.query<{ status: ShieldStatus; count: string; regulated_count: string }>(
      `SELECT status, COUNT(*) AS count, COUNT(*) FILTER (WHERE regulated) AS regulated_count
       FROM os_sector_shield_audits GROUP BY status`,
    );
    const summary: ShieldSummary = { total: 0, blocked: 0, passed: 0, warning: 0, regulatedAudits: 0, topViolations: [] };
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      summary.total += n;
      if (r.status === "blocked") summary.blocked += n;
      if (r.status === "passed") summary.passed += n;
      if (r.status === "warning") summary.warning += n;
      summary.regulatedAudits += parseInt(r.regulated_count, 10);
    }
    try {
      const v = await this.db.query<{ violation: string; count: string }>(
        `SELECT violation, COUNT(*) AS count
         FROM os_sector_shield_audits, jsonb_array_elements_text(claims_violations) AS violation
         GROUP BY violation ORDER BY count DESC LIMIT 5`,
      );
      summary.topViolations = v.map((x) => ({ violation: x.violation, count: parseInt(x.count, 10) }));
    } catch { /* ignore */ }
    return summary;
  }
}
