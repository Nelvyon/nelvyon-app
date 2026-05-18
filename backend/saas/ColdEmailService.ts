import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LLM_DEFAULT_MAX_TOKENS, LLM_DEFAULT_MODEL, LlmClient } from "../os-agents/LlmClient";

export type ColdEmailSequenceEmail = {
  step: number;
  subject: string;
  body: string;
  sendAfterDays: number;
};

export type GenerateSequenceInput = {
  targetCompany: string;
  targetName: string;
  targetRole: string;
  targetIndustry: string;
  ourService: string;
  valueProposition: string;
  senderName: string;
};

export type GeneratedSequence = {
  emails: ColdEmailSequenceEmail[];
  totalSteps: number;
};

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type ProspectStatus = "pending" | "sent" | "replied";

export type ColdEmailCampaign = {
  id: string;
  userId: string;
  targetCompany: string;
  input: GenerateSequenceInput;
  sequence: GeneratedSequence;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
};

export type ColdEmailProspect = {
  id: string;
  campaignId: string;
  userId: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  status: ProspectStatus;
  currentStep: number;
  sendAt: string | null;
  sentAt: string | null;
  repliedAt: string | null;
  createdAt: string;
};

export type ProspectInput = {
  name: string;
  email: string;
  company?: string;
  role?: string;
};

export type CreateCampaignInput = GenerateSequenceInput;

export type CampaignStats = {
  totalProspects: number;
  emailsSent: number;
  opens: number | null;
  replied: number;
  responseRate: number;
};

export type ColdEmailServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

const SEQ_TEMPERATURE = 0.7;

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.floor(days)));
  return d;
}

function parseSequenceFromLlm(raw: string): GeneratedSequence {
  const payload = extractJsonPayload(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("generateSequence: respuesta no es JSON válido");
  }
  const root = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  let emailsRaw = root.emails;
  if (!Array.isArray(emailsRaw) && Array.isArray(parsed)) {
    emailsRaw = parsed;
  }
  if (!Array.isArray(emailsRaw)) {
    throw new Error("generateSequence: falta array emails");
  }
  const emails: ColdEmailSequenceEmail[] = [];
  for (let i = 0; i < emailsRaw.length; i += 1) {
    const item = emailsRaw[i];
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const subject = typeof o.subject === "string" ? o.subject : "";
    const body = typeof o.body === "string" ? o.body : "";
    const sendAfterDays = typeof o.sendAfterDays === "number" ? o.sendAfterDays : Number(o.sendAfterDays ?? 0);
    emails.push({
      step: typeof o.step === "number" ? o.step : i + 1,
      subject,
      body,
      sendAfterDays: Number.isFinite(sendAfterDays) ? sendAfterDays : 0,
    });
  }
  if (emails.length < 3) {
    throw new Error("generateSequence: se esperaban al menos 3 emails");
  }
  const capped = emails.slice(0, 5);
  return { emails: capped, totalSteps: capped.length };
}

function mapCampaignRow(r: {
  id: string;
  user_id: string;
  target_company: string;
  input: unknown;
  sequence: unknown;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}): ColdEmailCampaign {
  const input = r.input as GenerateSequenceInput;
  const seq = r.sequence as GeneratedSequence;
  return {
    id: r.id,
    userId: r.user_id,
    targetCompany: r.target_company,
    input,
    sequence: seq,
    status: r.status as CampaignStatus,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
  };
}

function mapProspectRow(r: {
  id: string;
  campaign_id: string;
  user_id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  status: string;
  current_step: number;
  send_at: Date | string | null;
  sent_at: Date | string | null;
  replied_at: Date | string | null;
  created_at: Date | string;
}): ColdEmailProspect {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    company: r.company,
    role: r.role,
    status: r.status as ProspectStatus,
    currentStep: typeof r.current_step === "number" ? r.current_step : Number(r.current_step ?? 0),
    sendAt: r.send_at == null ? null : typeof r.send_at === "string" ? r.send_at : r.send_at.toISOString(),
    sentAt: r.sent_at == null ? null : typeof r.sent_at === "string" ? r.sent_at : r.sent_at.toISOString(),
    repliedAt: r.replied_at == null ? null : typeof r.replied_at === "string" ? r.replied_at : r.replied_at.toISOString(),
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
  };
}

export class ColdEmailService {
  constructor(private readonly deps: ColdEmailServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async generateSequence(userId: string, input: GenerateSequenceInput): Promise<GeneratedSequence> {
    void userId;
    const prompt = `You are an elite B2B cold outreach copywriter. Build a cohesive cold email SEQUENCE (3 to 5 emails) in Spanish or matching the prospect context.

Target company: ${input.targetCompany}
Contact name: ${input.targetName}
Role: ${input.targetRole}
Industry: ${input.targetIndustry}
Our service: ${input.ourService}
Value proposition: ${input.valueProposition}
Sender name: ${input.senderName}

Return ONLY valid JSON:
{
  "emails": [
    {
      "step": 1,
      "subject": "...",
      "body": "plain text email body with line breaks",
      "sendAfterDays": 0
    }
  ]
}

Rules:
- 3 to 5 emails, escalating politely.
- sendAfterDays for email 1 is days after campaign launch (0 = same day).
- sendAfterDays for email k>1 is days AFTER the previous email was sent.
- No HTML. Personalize with company/name naturally.`;

    const raw = await this.llm.complete(prompt, {
      model: LLM_DEFAULT_MODEL,
      maxTokens: LLM_DEFAULT_MAX_TOKENS,
      temperature: SEQ_TEMPERATURE,
    });
    return parseSequenceFromLlm(raw);
  }

  async createCampaign(userId: string, input: CreateCampaignInput): Promise<ColdEmailCampaign> {
    const sequence = await this.generateSequence(userId, input);
    const rows = await this.db.query<Parameters<typeof mapCampaignRow>[0]>(
      `INSERT INTO cold_email_campaigns (user_id, target_company, input, sequence, status, updated_at)
       VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb, 'draft', NOW())
       RETURNING id::text, user_id::text, target_company, input, sequence, status, created_at, updated_at`,
      [userId, input.targetCompany.trim(), JSON.stringify(input), JSON.stringify(sequence)],
    );
    const r = rows[0];
    if (!r) throw new Error("createCampaign: insert failed");
    return mapCampaignRow(r);
  }

  async addProspect(campaignId: string, userId: string, prospect: ProspectInput): Promise<ColdEmailProspect> {
    const rows = await this.db.query<Parameters<typeof mapProspectRow>[0]>(
      `INSERT INTO cold_email_prospects (campaign_id, user_id, name, email, company, role, status, current_step)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, 'pending', 0)
       RETURNING id::text, campaign_id::text, user_id::text, name, email, company, role,
                 status, current_step, send_at, sent_at, replied_at, created_at`,
      [
        campaignId,
        userId,
        prospect.name.trim(),
        prospect.email.trim(),
        prospect.company?.trim() || null,
        prospect.role?.trim() || null,
      ],
    );
    const r = rows[0];
    if (!r) throw new Error("addProspect: insert failed");
    return mapProspectRow(r);
  }

  async launchCampaign(campaignId: string, userId: string): Promise<ColdEmailCampaign> {
    const campRows = await this.db.query<Parameters<typeof mapCampaignRow>[0]>(
      `SELECT id::text, user_id::text, target_company, input, sequence, status, created_at, updated_at
       FROM cold_email_campaigns
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [campaignId, userId],
    );
    const camp = campRows[0];
    if (!camp) throw new Error("launchCampaign: campaña no encontrada");
    if (camp.status !== "draft") throw new Error("launchCampaign: solo se puede lanzar desde borrador");
    const sequence = camp.sequence as GeneratedSequence;
    const emails = sequence?.emails ?? [];
    if (emails.length === 0) throw new Error("launchCampaign: secuencia vacía");

    const now = new Date();
    const firstDelay = emails[0]?.sendAfterDays ?? 0;
    const firstSendAt = addDays(now, firstDelay);

    await this.db.query(
      `UPDATE cold_email_campaigns SET status = 'active', updated_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid`,
      [campaignId, userId],
    );

    await this.db.query(
      `UPDATE cold_email_prospects
       SET send_at = $3::timestamptz, current_step = 0, status = 'pending', updated_at = NOW()
       WHERE campaign_id = $1::uuid AND user_id = $2::uuid AND status = 'pending' AND replied_at IS NULL`,
      [campaignId, userId, firstSendAt.toISOString()],
    );

    const outRows = await this.db.query<Parameters<typeof mapCampaignRow>[0]>(
      `SELECT id::text, user_id::text, target_company, input, sequence, status, created_at, updated_at
       FROM cold_email_campaigns
       WHERE id = $1::uuid
       LIMIT 1`,
      [campaignId],
    );
    const r = outRows[0];
    if (!r) throw new Error("launchCampaign: reload failed");
    return mapCampaignRow(r);
  }

  /** Cron-style: marks due emails as sent and schedules next step (actual SMTP/Resend out of scope). */
  async processScheduledEmails(): Promise<{ processed: number }> {
    const due = await this.db.query<{
      id: string;
      campaign_id: string;
      user_id: string;
      current_step: number;
      sequence: unknown;
    }>(
      `SELECT p.id::text, p.campaign_id::text, p.user_id::text, p.current_step, c.sequence
       FROM cold_email_prospects p
       INNER JOIN cold_email_campaigns c ON c.id = p.campaign_id
       WHERE c.status = 'active'
         AND p.status = 'pending'
         AND p.send_at IS NOT NULL
         AND p.send_at <= NOW()
         AND p.replied_at IS NULL`,
    );

    let processed = 0;
    const now = new Date();

    for (const row of due) {
      const seq = row.sequence as GeneratedSequence;
      const emails = seq?.emails ?? [];
      const idx = typeof row.current_step === "number" ? row.current_step : 0;
      if (idx >= emails.length) continue;

      const nextIdx = idx + 1;
      if (nextIdx >= emails.length) {
        await this.db.query(
          `UPDATE cold_email_prospects
           SET current_step = $2, status = 'sent', send_at = NULL, sent_at = NOW(), updated_at = NOW()
           WHERE id = $1::uuid`,
          [row.id, nextIdx],
        );
      } else {
        const nextDays = emails[nextIdx]?.sendAfterDays ?? 0;
        const nextSend = addDays(now, nextDays);
        await this.db.query(
          `UPDATE cold_email_prospects
           SET current_step = $2, send_at = $3::timestamptz, sent_at = NOW(), updated_at = NOW()
           WHERE id = $1::uuid`,
          [row.id, nextIdx, nextSend.toISOString()],
        );
      }
      processed += 1;
    }

    return { processed };
  }

  async detectReply(prospectId: string, userId: string): Promise<ColdEmailProspect | null> {
    const rows = await this.db.query<Parameters<typeof mapProspectRow>[0]>(
      `UPDATE cold_email_prospects
       SET status = 'replied', replied_at = NOW(), send_at = NULL, updated_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid
       RETURNING id::text, campaign_id::text, user_id::text, name, email, company, role,
                 status, current_step, send_at, sent_at, replied_at, created_at`,
      [prospectId, userId],
    );
    const r = rows[0];
    return r ? mapProspectRow(r) : null;
  }

  async getStats(campaignId: string, userId: string): Promise<CampaignStats> {
    const own = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM cold_email_campaigns WHERE id = $1::uuid AND user_id = $2::uuid`,
      [campaignId, userId],
    );
    if (!own[0] || own[0].n === "0") {
      throw new Error("getStats: campaña no encontrada");
    }

    const agg = await this.db.query<{
      total: string;
      replied: string;
      steps: string | null;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'replied')::text AS replied,
         COALESCE(SUM(current_step), 0)::text AS steps
       FROM cold_email_prospects
       WHERE campaign_id = $1::uuid AND user_id = $2::uuid`,
      [campaignId, userId],
    );
    const a = agg[0] ?? { total: "0", replied: "0", steps: "0" };
    const totalProspects = Number(a.total) || 0;
    const replied = Number(a.replied) || 0;
    const emailsSent = Number(a.steps) || 0;
    const responseRate = totalProspects > 0 ? replied / totalProspects : 0;

    return {
      totalProspects,
      emailsSent,
      opens: null,
      replied,
      responseRate,
    };
  }

  async getCampaigns(userId: string): Promise<ColdEmailCampaign[]> {
    const rows = await this.db.query<Parameters<typeof mapCampaignRow>[0]>(
      `SELECT id::text, user_id::text, target_company, input, sequence, status, created_at, updated_at
       FROM cold_email_campaigns
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(mapCampaignRow);
  }

  async getCampaignById(campaignId: string, userId: string): Promise<ColdEmailCampaign | null> {
    const rows = await this.db.query<Parameters<typeof mapCampaignRow>[0]>(
      `SELECT id::text, user_id::text, target_company, input, sequence, status, created_at, updated_at
       FROM cold_email_campaigns
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [campaignId, userId],
    );
    const r = rows[0];
    return r ? mapCampaignRow(r) : null;
  }

  async getProspectsForCampaign(campaignId: string, userId: string): Promise<ColdEmailProspect[]> {
    const rows = await this.db.query<Parameters<typeof mapProspectRow>[0]>(
      `SELECT id::text, campaign_id::text, user_id::text, name, email, company, role,
              status, current_step, send_at, sent_at, replied_at, created_at
       FROM cold_email_prospects
       WHERE campaign_id = $1::uuid AND user_id = $2::uuid
       ORDER BY created_at ASC`,
      [campaignId, userId],
    );
    return rows.map(mapProspectRow);
  }
}

let cachedColdEmailService: ColdEmailService | undefined;

export function getColdEmailService(): ColdEmailService {
  if (!cachedColdEmailService) cachedColdEmailService = new ColdEmailService();
  return cachedColdEmailService;
}

export function resetColdEmailServiceForTests(): void {
  cachedColdEmailService = undefined;
}
