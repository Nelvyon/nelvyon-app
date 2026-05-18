import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LlmClient } from "../os-agents/LlmClient";

export type LeadCategory = "hot" | "warm" | "cold";

export type LeadData = {
  name: string;
  email: string;
  company?: string;
  website?: string;
  employees?: number;
  revenue?: number;
  industry?: string;
  source: string;
  pagesVisited?: number;
  timeOnSite?: number;
  emailOpens?: number;
  lastActivity?: string;
};

export type LeadScoreResult = {
  score: number;
  category: LeadCategory;
  reasons: string[];
  nextAction: string;
};

export type ScoredLead = LeadData &
  LeadScoreResult & {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };

type LeadScoringServiceDeps = {
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

function inferCategory(score: number): LeadCategory {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function heuristicScore(lead: LeadData): LeadScoreResult {
  let score = 10;
  score += Math.min(25, Math.max(0, n(lead.pagesVisited) * 2));
  score += Math.min(20, Math.max(0, n(lead.emailOpens) * 3));
  score += Math.min(20, Math.max(0, n(lead.timeOnSite) / 2));
  if (lead.source.toLowerCase().includes("referral")) score += 12;
  if (lead.industry && ["saas", "ecommerce", "b2b"].includes(lead.industry.toLowerCase())) score += 8;
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const category = inferCategory(finalScore);
  return {
    score: finalScore,
    category,
    reasons: [`Engagement score ${finalScore}`, `Source: ${lead.source}`],
    nextAction: category === "hot" ? "Contactar en <24h con propuesta." : category === "warm" ? "Nurturing con caso de éxito." : "Secuencia educativa automatizada.",
  };
}

export class LeadScoringService {
  constructor(private readonly deps: LeadScoringServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async scoreLead(userId: string, leadData: LeadData): Promise<LeadScoreResult> {
    const prompt = `You are a B2B lead scoring assistant.
Score this lead from 0 to 100 and return only JSON.
User: ${userId}
Lead: ${JSON.stringify(leadData)}
Rules:
- hot if score >= 70
- warm if score between 40 and 69
- cold if score < 40
Return:
{"score":number,"category":"hot|warm|cold","reasons":["..."],"nextAction":"..."} `;
    try {
      const out = await this.llm.complete(prompt, { model: "gpt-4o", temperature: 0.1, maxTokens: 600 });
      const parsed = JSON.parse(parseJsonPayload(out)) as Partial<LeadScoreResult>;
      const score = Math.max(0, Math.min(100, Math.round(n(parsed.score))));
      const category = parsed.category === "hot" || parsed.category === "warm" || parsed.category === "cold" ? parsed.category : inferCategory(score);
      const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.filter((r): r is string => typeof r === "string").slice(0, 8) : [];
      const nextAction = typeof parsed.nextAction === "string" && parsed.nextAction.trim() ? parsed.nextAction.trim() : "Priorizar seguimiento comercial.";
      return { score, category, reasons, nextAction };
    } catch {
      return heuristicScore(leadData);
    }
  }

  async saveLead(userId: string, leadData: LeadData): Promise<ScoredLead> {
    const scored = await this.scoreLead(userId, leadData);
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      company: string | null;
      data: LeadData;
      score: number | string;
      category: LeadCategory;
      reasons: string[] | null;
      next_action: string;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `INSERT INTO scored_leads (user_id, name, email, company, data, score, category, reasons, next_action, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::int, $7, $8::jsonb, $9, NOW(), NOW())
       RETURNING id::text, user_id::text, name, email, company, data, score, category, reasons, next_action, created_at, updated_at`,
      [
        userId,
        leadData.name,
        leadData.email,
        leadData.company ?? null,
        JSON.stringify(leadData),
        scored.score,
        scored.category,
        JSON.stringify(scored.reasons),
        scored.nextAction,
      ],
    );
    const r = rows[0];
    return {
      ...(r.data ?? {}),
      id: r.id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      company: r.company ?? undefined,
      score: n(r.score),
      category: r.category,
      reasons: Array.isArray(r.reasons) ? r.reasons : [],
      nextAction: r.next_action,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async updateLeadScore(leadId: string, userId: string): Promise<ScoredLead | null> {
    const existingRows = await this.db.query<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      company: string | null;
      data: LeadData;
      created_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, name, email, company, data, created_at
       FROM scored_leads WHERE id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
      [leadId, userId],
    );
    const existing = existingRows[0];
    if (!existing) return null;
    const leadData: LeadData = {
      ...(existing.data ?? {}),
      name: existing.name,
      email: existing.email,
      company: existing.company ?? undefined,
      source: existing.data?.source ?? "unknown",
    };
    const scored = await this.scoreLead(userId, leadData);
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      company: string | null;
      data: LeadData;
      score: number | string;
      category: LeadCategory;
      reasons: string[] | null;
      next_action: string;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `UPDATE scored_leads
       SET score = $3::int, category = $4, reasons = $5::jsonb, next_action = $6, updated_at = NOW()
       WHERE id = $1::uuid AND user_id = $2::uuid
       RETURNING id::text, user_id::text, name, email, company, data, score, category, reasons, next_action, created_at, updated_at`,
      [leadId, userId, scored.score, scored.category, JSON.stringify(scored.reasons), scored.nextAction],
    );
    const r = rows[0];
    return {
      ...(r.data ?? {}),
      id: r.id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      company: r.company ?? undefined,
      score: n(r.score),
      category: r.category,
      reasons: Array.isArray(r.reasons) ? r.reasons : [],
      nextAction: r.next_action,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async getLeads(
    userId: string,
    filters?: { category?: LeadCategory; minScore?: number; fromDate?: string; page?: number; pageSize?: number },
  ): Promise<{ items: ScoredLead[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, Math.round(filters?.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Math.round(filters?.pageSize ?? 20)));
    const where: string[] = ["user_id = $1::uuid"];
    const params: Array<string | number> = [userId];
    if (filters?.category) {
      where.push(`category = $${params.length + 1}`);
      params.push(filters.category);
    }
    if (typeof filters?.minScore === "number") {
      where.push(`score >= $${params.length + 1}::int`);
      params.push(Math.round(filters.minScore));
    }
    if (filters?.fromDate) {
      where.push(`created_at >= $${params.length + 1}::timestamptz`);
      params.push(filters.fromDate);
    }
    const countRows = await this.db.query<{ total: string }>(`SELECT COUNT(*)::text as total FROM scored_leads WHERE ${where.join(" AND ")}`, params);
    const total = Math.round(n(countRows[0]?.total));
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      company: string | null;
      data: LeadData;
      score: number | string;
      category: LeadCategory;
      reasons: string[] | null;
      next_action: string;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, name, email, company, data, score, category, reasons, next_action, created_at, updated_at
       FROM scored_leads
       WHERE ${where.join(" AND ")}
       ORDER BY score DESC, created_at DESC
       LIMIT $${params.length + 1}::int
       OFFSET $${params.length + 2}::int`,
      [...params, pageSize, (page - 1) * pageSize],
    );
    return {
      items: rows.map((r) => ({
        ...(r.data ?? {}),
        id: r.id,
        userId: r.user_id,
        name: r.name,
        email: r.email,
        company: r.company ?? undefined,
        score: n(r.score),
        category: r.category,
        reasons: Array.isArray(r.reasons) ? r.reasons : [],
        nextAction: r.next_action,
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getLeadById(leadId: string, userId: string): Promise<ScoredLead | null> {
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      company: string | null;
      data: LeadData;
      score: number | string;
      category: LeadCategory;
      reasons: string[] | null;
      next_action: string;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, name, email, company, data, score, category, reasons, next_action, created_at, updated_at
       FROM scored_leads WHERE id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
      [leadId, userId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      ...(r.data ?? {}),
      id: r.id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      company: r.company ?? undefined,
      score: n(r.score),
      category: r.category,
      reasons: Array.isArray(r.reasons) ? r.reasons : [],
      nextAction: r.next_action,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    };
  }

  async getStats(userId: string): Promise<{
    totalLeads: number;
    avgScore: number;
    hot: number;
    warm: number;
    cold: number;
    topLeads: Array<Pick<ScoredLead, "id" | "name" | "email" | "score" | "category" | "nextAction">>;
  }> {
    const summary = await this.db.query<{ total: string; avg_score: string; hot: string; warm: string; cold: string }>(
      `SELECT
         COUNT(*)::text as total,
         COALESCE(AVG(score), 0)::text as avg_score,
         COALESCE(SUM(CASE WHEN category = 'hot' THEN 1 ELSE 0 END), 0)::text as hot,
         COALESCE(SUM(CASE WHEN category = 'warm' THEN 1 ELSE 0 END), 0)::text as warm,
         COALESCE(SUM(CASE WHEN category = 'cold' THEN 1 ELSE 0 END), 0)::text as cold
       FROM scored_leads
       WHERE user_id = $1::uuid`,
      [userId],
    );
    const topRows = await this.db.query<{ id: string; name: string; email: string; score: string; category: LeadCategory; next_action: string }>(
      `SELECT id::text, name, email, score::text, category, next_action
       FROM scored_leads
       WHERE user_id = $1::uuid
       ORDER BY score DESC, updated_at DESC
       LIMIT 5`,
      [userId],
    );
    return {
      totalLeads: Math.round(n(summary[0]?.total)),
      avgScore: n(summary[0]?.avg_score),
      hot: Math.round(n(summary[0]?.hot)),
      warm: Math.round(n(summary[0]?.warm)),
      cold: Math.round(n(summary[0]?.cold)),
      topLeads: topRows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        score: n(r.score),
        category: r.category,
        nextAction: r.next_action,
      })),
    };
  }
}

let cachedLeadScoringService: LeadScoringService | undefined;

export function getLeadScoringService(): LeadScoringService {
  if (!cachedLeadScoringService) cachedLeadScoringService = new LeadScoringService();
  return cachedLeadScoringService;
}

export function resetLeadScoringServiceForTests(): void {
  cachedLeadScoringService = undefined;
}
