import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LlmClient } from "../os-agents/LlmClient";

export type BriefingInput = {
  companyName: string;
  website?: string;
  industry: string;
  description?: string;
  targetAudience?: string;
  goals?: string[];
};

export type BriefingResult = {
  summary: string;
  businessAnalysis: string;
  competitors: string[];
  targetAudience: string;
  recommendedChannels: string[];
  actionPlan: string[];
  strengths: string[];
  opportunities: string[];
  estimatedBudget: { min: number; max: number };
};

export type ClientBriefing = {
  id: string;
  userId: string;
  companyName: string;
  input: BriefingInput;
  result: BriefingResult;
  createdAt: string;
};

type ClientBriefingServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

function parseJsonPayload(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

function n(v: unknown): number {
  const out = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

function fallback(input: BriefingInput): BriefingResult {
  const company = input.companyName;
  const industry = input.industry;
  const audience = input.targetAudience ?? "Decisores y equipos operativos del sector.";
  return {
    summary: `${company} opera en ${industry} con potencial de crecimiento mediante adquisición y retención digital.`,
    businessAnalysis: `Se detecta oportunidad para mejorar posicionamiento, pipeline comercial y conversión en canales digitales.`,
    competitors: ["Competidor A", "Competidor B", "Competidor C"],
    targetAudience: audience,
    recommendedChannels: ["SEO", "Google Ads", "Email", "Social Media"],
    actionPlan: ["Auditoría inicial", "Definir propuesta de valor", "Lanzar campañas de captación", "Optimizar conversión semanal"],
    strengths: ["Propuesta clara", "Capacidad de ejecución"],
    opportunities: ["Escalar tráfico cualificado", "Automatizar nurturing"],
    estimatedBudget: { min: 800, max: 2500 },
  };
}

function normalizeResult(input: BriefingInput, raw: Partial<BriefingResult>): BriefingResult {
  const fb = fallback(input);
  const budgetRaw = raw.estimatedBudget ?? {};
  return {
    summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary : fb.summary,
    businessAnalysis: typeof raw.businessAnalysis === "string" && raw.businessAnalysis.trim() ? raw.businessAnalysis : fb.businessAnalysis,
    competitors: Array.isArray(raw.competitors) ? raw.competitors.filter((v): v is string => typeof v === "string").slice(0, 8) : fb.competitors,
    targetAudience: typeof raw.targetAudience === "string" && raw.targetAudience.trim() ? raw.targetAudience : fb.targetAudience,
    recommendedChannels: Array.isArray(raw.recommendedChannels)
      ? raw.recommendedChannels.filter((v): v is string => typeof v === "string").slice(0, 8)
      : fb.recommendedChannels,
    actionPlan: Array.isArray(raw.actionPlan) ? raw.actionPlan.filter((v): v is string => typeof v === "string").slice(0, 10) : fb.actionPlan,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.filter((v): v is string => typeof v === "string").slice(0, 8) : fb.strengths,
    opportunities: Array.isArray(raw.opportunities) ? raw.opportunities.filter((v): v is string => typeof v === "string").slice(0, 8) : fb.opportunities,
    estimatedBudget: {
      min: Math.max(0, Math.round(n((budgetRaw as { min?: unknown }).min || fb.estimatedBudget.min))),
      max: Math.max(0, Math.round(n((budgetRaw as { max?: unknown }).max || fb.estimatedBudget.max))),
    },
  };
}

export class ClientBriefingService {
  constructor(private readonly deps: ClientBriefingServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async generateBriefing(userId: string, input: BriefingInput): Promise<BriefingResult> {
    const prompt = `Generate a client business briefing in JSON only.
User: ${userId}
Input: ${JSON.stringify(input)}

Return:
{
  "summary":"...",
  "businessAnalysis":"...",
  "competitors":["..."],
  "targetAudience":"...",
  "recommendedChannels":["..."],
  "actionPlan":["..."],
  "strengths":["..."],
  "opportunities":["..."],
  "estimatedBudget":{"min":1000,"max":3000}
}`;
    try {
      const out = await this.llm.complete(prompt, { model: "gpt-4o", temperature: 0.3, maxTokens: 1200 });
      const parsed = JSON.parse(parseJsonPayload(out)) as Partial<BriefingResult>;
      return normalizeResult(input, parsed);
    } catch {
      return fallback(input);
    }
  }

  async saveBriefing(userId: string, input: BriefingInput, result: BriefingResult): Promise<ClientBriefing> {
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      company_name: string;
      input: BriefingInput;
      result: BriefingResult;
      created_at: Date | string;
    }>(
      `INSERT INTO client_briefings (user_id, company_name, input, result, created_at)
       VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb, NOW())
       RETURNING id::text, user_id::text, company_name, input, result, created_at`,
      [userId, input.companyName, JSON.stringify(input), JSON.stringify(result)],
    );
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      companyName: r.company_name,
      input: r.input,
      result: r.result,
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    };
  }

  async getBriefings(userId: string): Promise<ClientBriefing[]> {
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      company_name: string;
      input: BriefingInput;
      result: BriefingResult;
      created_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, company_name, input, result, created_at
       FROM client_briefings
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      companyName: r.company_name,
      input: r.input,
      result: r.result,
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    }));
  }

  async getBriefing(briefingId: string, userId: string): Promise<ClientBriefing | null> {
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      company_name: string;
      input: BriefingInput;
      result: BriefingResult;
      created_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, company_name, input, result, created_at
       FROM client_briefings
       WHERE id = $1::uuid AND user_id = $2::uuid
       LIMIT 1`,
      [briefingId, userId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      userId: r.user_id,
      companyName: r.company_name,
      input: r.input,
      result: r.result,
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    };
  }
}

let cachedClientBriefingService: ClientBriefingService | undefined;

export function getClientBriefingService(): ClientBriefingService {
  if (!cachedClientBriefingService) cachedClientBriefingService = new ClientBriefingService();
  return cachedClientBriefingService;
}

export function resetClientBriefingServiceForTests(): void {
  cachedClientBriefingService = undefined;
}
