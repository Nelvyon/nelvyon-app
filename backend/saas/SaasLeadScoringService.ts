/**
 * SaasLeadScoringService — reglas de scoring configurables + evaluación por contacto.
 * Tables: saas_lead_scoring_rules, saas_lead_scores (migration 440).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RuleField =
  | "contact.has_email"
  | "contact.has_phone"
  | "contact.has_company"
  | "contact.status"
  | "contact.pipeline_stage"
  | "contact.email_opens"
  | "contact.email_clicks"
  | "contact.activity_count"
  | "contact.has_notes"
  | "contact.value";

export type RuleOperator =
  | "equals" | "not_equals"
  | "greater_than" | "less_than"
  | "contains" | "not_contains"
  | "is_true" | "is_false";

export type RuleCategory = "demographic" | "behavioral" | "engagement" | "firmographic";
export type LeadGrade    = "A" | "B" | "C" | "D";
export type SaasLeadCategory = "hot" | "warm" | "cold";

export interface ScoringRule {
  id: string; tenantId: string; name: string;
  field: RuleField; operator: RuleOperator; value: string;
  points: number; category: RuleCategory; active: boolean;
  createdAt: string; updatedAt: string;
}

export interface RuleBreakdownItem { ruleId: string; ruleName: string; points: number }

export interface LeadScore {
  id: string; tenantId: string; contactId: string;
  contactName: string; contactEmail: string; contactCompany: string | null;
  score: number; grade: LeadGrade; category: SaasLeadCategory;
  reasons: string[]; ruleBreakdown: RuleBreakdownItem[];
  scoredAt: string;
}

export interface CreateRuleInput {
  name: string; field: RuleField; operator: RuleOperator;
  value?: string; points: number; category?: RuleCategory;
}

export class SaasLeadScoringError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION") {
    super(message); this.name = "SaasLeadScoringError";
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function rowToRule(r: Record<string, unknown>): ScoringRule {
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id ?? r.tenantId),
    name: String(r.name),
    field: String(r.field) as RuleField,
    operator: String(r.operator) as RuleOperator,
    value: String(r.value ?? ""),
    points: Number(r.points ?? 0),
    category: String(r.category ?? "behavioral") as RuleCategory,
    active: Boolean(r.active),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function rowToScore(r: Record<string, unknown>): LeadScore {
  let reasons: string[] = [];
  let breakdown: RuleBreakdownItem[] = [];
  try { reasons = JSON.parse(String(r.reasons ?? "[]")) as string[]; } catch { reasons = []; }
  try { breakdown = JSON.parse(String(r.rule_breakdown ?? "[]")) as RuleBreakdownItem[]; } catch { breakdown = []; }
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id ?? r.tenantId),
    contactId: String(r.contact_id ?? r.contactId),
    contactName: String(r.contact_name ?? r.contactName ?? ""),
    contactEmail: String(r.contact_email ?? r.contactEmail ?? ""),
    contactCompany: r.contact_company != null ? String(r.contact_company) : r.company_name != null ? String(r.company_name) : null,
    score: Number(r.score ?? 0),
    grade: String(r.grade ?? "D") as LeadGrade,
    category: String(r.category ?? "cold") as SaasLeadCategory,
    reasons,
    ruleBreakdown: breakdown,
    scoredAt: new Date(r.scored_at as string).toISOString(),
  };
}

// ── Scoring logic ─────────────────────────────────────────────────────────────

interface ContactSnapshot {
  hasEmail: boolean; hasPhone: boolean; hasCompany: boolean; hasNotes: boolean;
  status: string; pipelineStage: string; value: number;
  emailOpens: number; emailClicks: number; activityCount: number;
}

function evaluateRule(rule: ScoringRule, snap: ContactSnapshot): boolean {
  const { field, operator, value } = rule;

  const contactVal = (): string | number | boolean => {
    switch (field) {
      case "contact.has_email":      return snap.hasEmail;
      case "contact.has_phone":      return snap.hasPhone;
      case "contact.has_company":    return snap.hasCompany;
      case "contact.has_notes":      return snap.hasNotes;
      case "contact.status":         return snap.status;
      case "contact.pipeline_stage": return snap.pipelineStage;
      case "contact.email_opens":    return snap.emailOpens;
      case "contact.email_clicks":   return snap.emailClicks;
      case "contact.activity_count": return snap.activityCount;
      case "contact.value":          return snap.value;
      default: return "";
    }
  };

  const cv = contactVal();

  switch (operator) {
    case "is_true":    return cv === true;
    case "is_false":   return cv === false;
    case "equals":     return String(cv).toLowerCase() === value.toLowerCase();
    case "not_equals": return String(cv).toLowerCase() !== value.toLowerCase();
    case "contains":   return String(cv).toLowerCase().includes(value.toLowerCase());
    case "not_contains": return !String(cv).toLowerCase().includes(value.toLowerCase());
    case "greater_than": return Number(cv) > Number(value);
    case "less_than":    return Number(cv) < Number(value);
    default: return false;
  }
}

function computeGradeAndCategory(score: number, maxPos: number): { grade: LeadGrade; category: SaasLeadCategory } {
  const pct = maxPos > 0 ? score / maxPos : 0;
  const grade: LeadGrade = pct >= 0.75 ? "A" : pct >= 0.50 ? "B" : pct >= 0.25 ? "C" : "D";
  const category: SaasLeadCategory = grade === "A" ? "hot" : grade === "D" ? "cold" : "warm";
  return { grade, category };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasLeadScoringService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Rules ─────────────────────────────────────────────────────────────────

  async listRules(tenantId: string): Promise<ScoringRule[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_lead_scoring_rules WHERE tenant_id=$1 ORDER BY category, name`,
      [tenantId],
    );
    return rows.map(rowToRule);
  }

  async createRule(tenantId: string, input: CreateRuleInput): Promise<ScoringRule> {
    if (!input.name?.trim()) throw new SaasLeadScoringError("name es obligatorio", "VALIDATION");
    if (!input.field)        throw new SaasLeadScoringError("field es obligatorio", "VALIDATION");
    if (input.points === undefined || input.points === null) throw new SaasLeadScoringError("points es obligatorio", "VALIDATION");
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_lead_scoring_rules (tenant_id,name,field,operator,value,points,category)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [tenantId, input.name.trim(), input.field, input.operator, input.value ?? "", input.points, input.category ?? "behavioral"],
    );
    if (!rows[0]) throw new SaasLeadScoringError("Error al crear regla", "VALIDATION");
    return rowToRule(rows[0]);
  }

  async updateRule(tenantId: string, id: string, patch: Partial<Pick<ScoringRule, "name" | "points" | "active" | "value" | "operator">>): Promise<ScoringRule> {
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [id, tenantId];
    let i = 3;
    if (patch.name    !== undefined) { sets.push(`name=$${i++}`);    params.push(patch.name.trim()); }
    if (patch.points  !== undefined) { sets.push(`points=$${i++}`);  params.push(patch.points); }
    if (patch.active  !== undefined) { sets.push(`active=$${i++}`);  params.push(patch.active); }
    if (patch.value   !== undefined) { sets.push(`value=$${i++}`);   params.push(patch.value); }
    if (patch.operator !== undefined) { sets.push(`operator=$${i++}`); params.push(patch.operator); }
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_lead_scoring_rules SET ${sets.join(",")}
       WHERE id=$1::uuid AND tenant_id=$2 RETURNING *`,
      params,
    );
    if (!rows[0]) throw new SaasLeadScoringError("Regla no encontrada", "NOT_FOUND");
    return rowToRule(rows[0]);
  }

  async deleteRule(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_lead_scoring_rules WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasLeadScoringError("Regla no encontrada", "NOT_FOUND");
  }

  // ── Scoring ───────────────────────────────────────────────────────────────

  async scoreContact(tenantId: string, contactId: string): Promise<LeadScore> {
    // Load active rules
    const rules = (await this.listRules(tenantId)).filter(r => r.active);

    // Build contact snapshot from DB
    const snapRows = await this.db.query<Record<string, unknown>>(
      `SELECT
         c.name, c.email, c.phone, c.company_name, c.notes, c.status, c.pipeline_stage, c.value,
         COUNT(DISTINCT cc.id) FILTER (WHERE cc.status='opened') AS email_opens,
         COUNT(DISTINCT cc.id) FILTER (WHERE cc.status='clicked') AS email_clicks,
         COUNT(DISTINCT a.id)  AS activity_count
       FROM saas_contacts c
       LEFT JOIN saas_campaign_contacts cc ON cc.contact_id = c.id
       LEFT JOIN saas_contact_activities a ON a.contact_id = c.id::text
       WHERE c.id=$1::uuid AND c.tenant_id=$2
       GROUP BY c.id`,
      [contactId, tenantId],
    );
    if (!snapRows[0]) throw new SaasLeadScoringError("Contacto no encontrado", "NOT_FOUND");
    const sr = snapRows[0];

    const snap: ContactSnapshot = {
      hasEmail:      sr.email != null && String(sr.email).length > 0,
      hasPhone:      sr.phone != null && String(sr.phone).length > 0,
      hasCompany:    sr.company_name != null && String(sr.company_name).length > 0,
      hasNotes:      sr.notes != null && String(sr.notes).length > 0,
      status:        String(sr.status ?? ""),
      pipelineStage: String(sr.pipeline_stage ?? ""),
      value:         Number(sr.value ?? 0),
      emailOpens:    Number(sr.email_opens ?? 0),
      emailClicks:   Number(sr.email_clicks ?? 0),
      activityCount: Number(sr.activity_count ?? 0),
    };

    // Evaluate rules
    const breakdown: RuleBreakdownItem[] = [];
    const reasons: string[] = [];
    let score = 0;
    const maxPos = rules.filter(r => r.points > 0).reduce((s, r) => s + r.points, 0);

    for (const rule of rules) {
      if (evaluateRule(rule, snap)) {
        score += rule.points;
        breakdown.push({ ruleId: rule.id, ruleName: rule.name, points: rule.points });
        if (rule.points > 0) reasons.push(rule.name);
      }
    }

    // clamp to [0, ...) — negative rules can make score below 0
    score = Math.max(0, score);
    const { grade, category } = computeGradeAndCategory(score, maxPos);

    // Upsert score
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_lead_scores (tenant_id,contact_id,score,grade,category,reasons,rule_breakdown,scored_at)
       VALUES ($1,$2::uuid,$3,$4,$5,$6::jsonb,$7::jsonb,NOW())
       ON CONFLICT (tenant_id,contact_id)
       DO UPDATE SET score=$3,grade=$4,category=$5,reasons=$6::jsonb,rule_breakdown=$7::jsonb,scored_at=NOW()
       RETURNING *`,
      [tenantId, contactId, score, grade, category, JSON.stringify(reasons), JSON.stringify(breakdown)],
    );
    const row = rows[0];
    if (!row) throw new SaasLeadScoringError("Error al guardar score", "VALIDATION");

    return {
      id: String(row.id),
      tenantId,
      contactId,
      contactName: String(sr.name ?? ""),
      contactEmail: String(sr.email ?? ""),
      contactCompany: sr.company_name != null ? String(sr.company_name) : null,
      score,
      grade,
      category,
      reasons,
      ruleBreakdown: breakdown,
      scoredAt: new Date().toISOString(),
    };
  }

  async listScores(tenantId: string, opts?: { category?: SaasLeadCategory; limit?: number }): Promise<LeadScore[]> {
    const conds = [`ls.tenant_id=$1`];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (opts?.category) { conds.push(`ls.category=$${i++}`); params.push(opts.category); }
    params.push(opts?.limit ?? 200);
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ls.*,
              c.name AS contact_name, c.email AS contact_email, c.company_name AS contact_company
       FROM saas_lead_scores ls
       LEFT JOIN saas_contacts c ON c.id = ls.contact_id::uuid AND c.tenant_id = ls.tenant_id
       WHERE ${conds.join(" AND ")}
       ORDER BY ls.score DESC LIMIT $${i}`,
      params,
    );
    return rows.map(rowToScore);
  }

  async getMaxPossibleScore(tenantId: string): Promise<number> {
    const rows = await this.db.query<{ total: string }>(
      `SELECT COALESCE(SUM(points),0)::text AS total FROM saas_lead_scoring_rules
       WHERE tenant_id=$1 AND active=true AND points>0`,
      [tenantId],
    );
    return Number(rows[0]?.total ?? 0);
  }
}

let _svc: SaasLeadScoringService | undefined;
export function getSaasLeadScoringService(): SaasLeadScoringService {
  _svc ??= new SaasLeadScoringService();
  return _svc;
}
export function resetSaasLeadScoringServiceForTests(): void { _svc = undefined; }
