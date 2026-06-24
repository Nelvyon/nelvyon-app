import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type SurveyType = "survey" | "nps" | "feedback" | "quiz";

export interface SurveyQuestion {
  id: string;
  type: "text" | "rating" | "multiple_choice" | "checkbox" | "nps";
  label: string;
  required?: boolean;
  options?: string[];
}

export interface Survey {
  id: string;
  tenantId: string;
  name: string;
  type: SurveyType;
  questions: SurveyQuestion[];
  responsesCount: number;
  npsScore: number | null;
  active: boolean;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  contactId: string | null;
  answers: Record<string, unknown>;
  score: number | null;
  completedAt: string;
}

export interface QrCode {
  id: string;
  tenantId: string;
  name: string;
  destinationUrl: string;
  color: string;
  bgColor: string;
  scans: number;
  lastScannedAt: string | null;
  createdAt: string;
}

export interface CreateSurveyInput {
  name: string;
  type?: SurveyType;
  questions?: SurveyQuestion[];
}

export interface SubmitResponseInput {
  contactId?: string;
  answers: Record<string, unknown>;
  score?: number;
}

export interface CreateQrInput {
  name: string;
  destinationUrl: string;
  color?: string;
  bgColor?: string;
}

export interface SurveyStats {
  responsesCount: number;
  avgScore: number | null;
  npsScore: number | null;
  completionRate: number;
}

export type SaasSurveysServiceDeps = { db?: Pick<DbClient, "query"> };

const SURV_SEL = `id, tenant_id as "tenantId", name, type, questions,
  responses_count as "responsesCount", nps_score as "npsScore",
  active, created_at as "createdAt"`;
const RESP_SEL = `id, survey_id as "surveyId", contact_id as "contactId",
  answers, score, completed_at as "completedAt"`;
const QR_SEL = `id, tenant_id as "tenantId", name, destination_url as "destinationUrl",
  color, bg_color as "bgColor", scans, last_scanned_at as "lastScannedAt",
  created_at as "createdAt"`;

function mapSurv(r: Record<string, unknown>): Survey {
  return {
    id: String(r.id), tenantId: String(r.tenantId), name: String(r.name),
    type: String(r.type) as SurveyType,
    questions: Array.isArray(r.questions) ? r.questions as SurveyQuestion[] : [],
    responsesCount: Number(r.responsesCount ?? 0),
    npsScore: r.npsScore != null ? Number(r.npsScore) : null,
    active: Boolean(r.active), createdAt: String(r.createdAt),
  };
}

function mapResp(r: Record<string, unknown>): SurveyResponse {
  return {
    id: String(r.id), surveyId: String(r.surveyId),
    contactId: r.contactId != null ? String(r.contactId) : null,
    answers: (r.answers as Record<string, unknown>) ?? {},
    score: r.score != null ? Number(r.score) : null,
    completedAt: String(r.completedAt),
  };
}

function mapQr(r: Record<string, unknown>): QrCode {
  return {
    id: String(r.id), tenantId: String(r.tenantId), name: String(r.name),
    destinationUrl: String(r.destinationUrl), color: String(r.color ?? "#000000"),
    bgColor: String(r.bgColor ?? "#ffffff"), scans: Number(r.scans ?? 0),
    lastScannedAt: r.lastScannedAt != null ? String(r.lastScannedAt) : null,
    createdAt: String(r.createdAt),
  };
}

export class SaasSurveysService {
  constructor(private readonly deps: SaasSurveysServiceDeps = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  // ── Surveys ───────────────────────────────────────────────────────────────

  async listSurveys(tenantId: string, type?: SurveyType): Promise<Survey[]> {
    const base = `SELECT ${SURV_SEL} FROM surveys WHERE tenant_id=$1`;
    const rows = type
      ? await this.db.query<Record<string, unknown>>(base + ` AND type=$2 ORDER BY created_at DESC`, [tenantId, type])
      : await this.db.query<Record<string, unknown>>(base + ` ORDER BY created_at DESC`, [tenantId]);
    return rows.map(mapSurv);
  }

  async getSurvey(tenantId: string, id: string): Promise<Survey | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${SURV_SEL} FROM surveys WHERE id=$1::uuid AND tenant_id=$2`,
      [id, tenantId],
    );
    return rows[0] ? mapSurv(rows[0]) : null;
  }

  async createSurvey(tenantId: string, input: CreateSurveyInput): Promise<Survey> {
    if (!input.name?.trim()) throw Object.assign(new Error("name is required"), { code: "VALIDATION" });
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO surveys (tenant_id, name, type, questions)
       VALUES ($1,$2,$3,$4::jsonb)
       RETURNING ${SURV_SEL}`,
      [tenantId, input.name.trim(), input.type ?? "survey", JSON.stringify(input.questions ?? [])],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasSurveysService.createSurvey: no row");
    return mapSurv(row);
  }

  async updateSurvey(tenantId: string, id: string, patch: Partial<CreateSurveyInput> & { active?: boolean }): Promise<Survey | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE surveys SET
         name      = COALESCE($3, name),
         type      = COALESCE($4, type),
         questions = COALESCE($5::jsonb, questions),
         active    = COALESCE($6, active)
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING ${SURV_SEL}`,
      [id, tenantId, patch.name ?? null, patch.type ?? null,
       patch.questions ? JSON.stringify(patch.questions) : null, patch.active ?? null],
    );
    return rows[0] ? mapSurv(rows[0]) : null;
  }

  async deleteSurvey(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM surveys WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    return rows.length > 0;
  }

  async submitResponse(surveyId: string, input: SubmitResponseInput): Promise<SurveyResponse> {
    const rows = await this.db.query<Record<string, unknown>>(
      `WITH ins AS (
         INSERT INTO survey_responses (survey_id, contact_id, answers, score)
         VALUES ($1::uuid,$2,$3::jsonb,$4)
         RETURNING ${RESP_SEL}
       ), cnt AS (
         UPDATE surveys SET
           responses_count = responses_count + 1,
           nps_score = (
             SELECT ROUND(AVG(score::numeric)::numeric, 1)
             FROM survey_responses WHERE survey_id=$1::uuid AND score IS NOT NULL
           )
         WHERE id=$1::uuid
       )
       SELECT * FROM ins`,
      [surveyId, input.contactId ?? null, JSON.stringify(input.answers), input.score ?? null],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasSurveysService.submitResponse: no row");
    return mapResp(row);
  }

  async listResponses(tenantId: string, surveyId: string): Promise<SurveyResponse[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT r.${RESP_SEL.replace(/\n/g, " ")} FROM survey_responses r
       JOIN surveys s ON s.id=r.survey_id
       WHERE r.survey_id=$1::uuid AND s.tenant_id=$2
       ORDER BY r.completed_at DESC`,
      [surveyId, tenantId],
    );
    return rows.map(mapResp);
  }

  async getSurveyStats(tenantId: string, surveyId: string): Promise<SurveyStats | null> {
    const survRow = await this.getSurvey(tenantId, surveyId);
    if (!survRow) return null;

    const [scoreRow] = await this.db.query<{ avgScore: string | null; count: string }>(
      `SELECT AVG(score)::text as "avgScore", COUNT(*)::text as count
       FROM survey_responses WHERE survey_id=$1::uuid`,
      [surveyId],
    );

    return {
      responsesCount: survRow.responsesCount,
      avgScore: scoreRow?.avgScore != null ? parseFloat(scoreRow.avgScore) : null,
      npsScore: survRow.npsScore,
      completionRate: 100,
    };
  }

  // ── QR Codes ──────────────────────────────────────────────────────────────

  async listQrCodes(tenantId: string): Promise<QrCode[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${QR_SEL} FROM qr_codes WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(mapQr);
  }

  async getQrCode(tenantId: string, id: string): Promise<QrCode | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${QR_SEL} FROM qr_codes WHERE id=$1::uuid AND tenant_id=$2`,
      [id, tenantId],
    );
    return rows[0] ? mapQr(rows[0]) : null;
  }

  async createQrCode(tenantId: string, input: CreateQrInput): Promise<QrCode> {
    if (!input.name?.trim()) throw Object.assign(new Error("name is required"), { code: "VALIDATION" });
    if (!input.destinationUrl?.startsWith("http")) throw Object.assign(new Error("valid URL required"), { code: "VALIDATION" });
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO qr_codes (tenant_id, name, destination_url, color, bg_color)
       VALUES ($1,$2,$3,$4,$5) RETURNING ${QR_SEL}`,
      [tenantId, input.name.trim(), input.destinationUrl, input.color ?? "#000000", input.bgColor ?? "#ffffff"],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasSurveysService.createQrCode: no row");
    return mapQr(row);
  }

  async updateQrCode(tenantId: string, id: string, patch: Partial<CreateQrInput>): Promise<QrCode | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE qr_codes SET
         name            = COALESCE($3, name),
         destination_url = COALESCE($4, destination_url),
         color           = COALESCE($5, color),
         bg_color        = COALESCE($6, bg_color)
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING ${QR_SEL}`,
      [id, tenantId, patch.name ?? null, patch.destinationUrl ?? null, patch.color ?? null, patch.bgColor ?? null],
    );
    return rows[0] ? mapQr(rows[0]) : null;
  }

  async deleteQrCode(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM qr_codes WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    return rows.length > 0;
  }

  async trackQrScan(id: string): Promise<string | null> {
    const rows = await this.db.query<{ destinationUrl: string }>(
      `UPDATE qr_codes SET scans=scans+1, last_scanned_at=NOW()
       WHERE id=$1::uuid RETURNING destination_url as "destinationUrl"`,
      [id],
    );
    return rows[0]?.destinationUrl ?? null;
  }

  // ── Share links ───────────────────────────────────────────────────────────

  async enableShare(tenantId: string, surveyId: string): Promise<string> {
    const slug = surveyId; // use UUID as slug for simplicity + guaranteed uniqueness
    const rows = await this.db.query<{ id: string }>(
      `UPDATE surveys SET share_enabled=TRUE, share_slug=$3
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING id`,
      [surveyId, tenantId, slug],
    );
    if (!rows.length) throw Object.assign(new Error("Survey not found"), { code: "NOT_FOUND" });
    return slug;
  }

  async disableShare(tenantId: string, surveyId: string): Promise<void> {
    await this.db.query(
      `UPDATE surveys SET share_enabled=FALSE WHERE id=$1::uuid AND tenant_id=$2`,
      [surveyId, tenantId],
    );
  }

  async getPublicSurvey(slugOrId: string): Promise<(Survey & { shareEnabled: boolean }) | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${SURV_SEL}, share_enabled as "shareEnabled"
       FROM surveys
       WHERE (share_slug=$1 OR id=$1::uuid) AND share_enabled=TRUE AND active=TRUE
       LIMIT 1`,
      [slugOrId],
    );
    if (!rows[0]) return null;
    const s = mapSurv(rows[0]);
    return { ...s, shareEnabled: true };
  }
}

let _svc: SaasSurveysService | undefined;
export function getSaasSurveysService(): SaasSurveysService {
  if (!_svc) _svc = new SaasSurveysService();
  return _svc;
}
export function resetSaasSurveysServiceForTests(): void { _svc = undefined; }
