import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "./LlmClient";
import { LlmClient } from "./LlmClient";
import { OsAgentError } from "./OsAgentError";

const MODEL_GPT4O = "gpt-4o";
const MODEL_TEMPERATURE = 0.3;
const MODEL_MAX_TOKENS = 1000;

const DEFAULT_PLATFORMS = ["chatgpt", "gemini", "perplexity"] as const;

export interface GeoAiCheck {
  id: string;
  userId: string;
  brandName: string;
  queryUsed: string;
  platform: string;
  responseText: string;
  brandMentioned: boolean;
  mentionPosition: number | null;
  sentiment: string;
  checkedAt: string;
}

export interface GeoAiScore {
  id: string;
  userId: string;
  brandName: string;
  platform: string;
  visibilityScore: number;
  totalChecks: number;
  mentions: number;
  avgPosition: number | null;
  lastComputed: string;
}

export interface OptimizationReport {
  currentScore: number;
  recommendations: string[];
  priorityActions: string[];
}

export interface FullAuditResult {
  brandName: string;
  industry: string;
  queries: string[];
  checks: GeoAiCheck[];
  scores: GeoAiScore[];
}

export type GeoAiVisibilityServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

function parseNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function detectMentionPosition(brandName: string, answer: string): number | null {
  const parts = answer
    .split(/[\n.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const b = brandName.toLowerCase();
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i].toLowerCase().includes(b)) return i + 1;
  }
  return null;
}

function detectSentiment(brandName: string, answer: string): "positive" | "neutral" | "negative" {
  const b = brandName.toLowerCase();
  const text = answer.toLowerCase();
  const idx = text.indexOf(b);
  if (idx < 0) return "neutral";
  const windowStart = Math.max(0, idx - 120);
  const windowEnd = Math.min(text.length, idx + b.length + 120);
  const context = text.slice(windowStart, windowEnd);
  const pos = ["best", "recommend", "trusted", "great", "top", "excelente", "recomendado", "líder"].some((k) =>
    context.includes(k),
  );
  const neg = ["avoid", "problem", "bad", "poor", "evita", "malo", "queja"].some((k) => context.includes(k));
  if (pos && !neg) return "positive";
  if (neg && !pos) return "negative";
  return "neutral";
}

export class GeoAiVisibilityService {
  constructor(private readonly deps: GeoAiVisibilityServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  private async askLlm(prompt: string): Promise<string> {
    return this.llm.complete(prompt, {
      model: MODEL_GPT4O,
      temperature: MODEL_TEMPERATURE,
      maxTokens: MODEL_MAX_TOKENS,
    });
  }

  async checkBrandVisibility(
    userId: string,
    brandName: string,
    industry: string,
    queries: string[],
    platform = "chatgpt",
  ): Promise<GeoAiCheck[]> {
    const out: GeoAiCheck[] = [];
    for (const rawQuery of queries) {
      const q = String(rawQuery ?? "").trim();
      if (!q) continue;
      const prompt = `Eres un usuario real consultando ${platform}. Industria: ${industry}.
Responde de forma natural y breve a esta consulta:
"${q}"
Incluye recomendaciones de marcas relevantes, como lo haría una IA conversacional.`;
      const responseText = await this.askLlm(prompt);
      const brandMentioned = responseText.toLowerCase().includes(brandName.toLowerCase());
      const mentionPosition = brandMentioned ? detectMentionPosition(brandName, responseText) : null;
      const sentiment = detectSentiment(brandName, responseText);

      const rows = await this.db.query<{
        id: string;
        userId: string;
        brandName: string;
        queryUsed: string;
        platform: string;
        responseText: string;
        brandMentioned: boolean;
        mentionPosition: number | null;
        sentiment: string;
        checkedAt: Date | string;
      }>(
        `INSERT INTO geo_ai_checks
          (user_id, brand_name, query_used, platform, response_text, brand_mentioned, mention_position, sentiment)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::int, $8)
         RETURNING id::text as id,
           user_id::text as "userId",
           brand_name as "brandName",
           query_used as "queryUsed",
           platform,
           response_text as "responseText",
           brand_mentioned as "brandMentioned",
           mention_position as "mentionPosition",
           sentiment,
           checked_at as "checkedAt"`,
        [userId, brandName, q, platform, responseText, brandMentioned, mentionPosition, sentiment],
      );
      const r = rows[0];
      out.push({
        id: r.id,
        userId: r.userId,
        brandName: r.brandName,
        queryUsed: r.queryUsed,
        platform: r.platform,
        responseText: r.responseText,
        brandMentioned: r.brandMentioned,
        mentionPosition: r.mentionPosition,
        sentiment: r.sentiment,
        checkedAt: typeof r.checkedAt === "string" ? r.checkedAt : r.checkedAt.toISOString(),
      });
    }
    return out;
  }

  async computeVisibilityScore(userId: string, brandName: string, platform: string): Promise<GeoAiScore> {
    const totals = await this.db.query<{ total_checks: string; mentions: string; avg_position: string | null }>(
      `SELECT
         COUNT(*)::text as total_checks,
         COALESCE(SUM(CASE WHEN brand_mentioned THEN 1 ELSE 0 END), 0)::text as mentions,
         AVG(mention_position)::text as avg_position
       FROM geo_ai_checks
       WHERE user_id = $1::uuid AND brand_name = $2 AND platform = $3`,
      [userId, brandName, platform],
    );
    const totalChecks = Math.trunc(parseNum(totals[0]?.total_checks));
    const mentions = Math.trunc(parseNum(totals[0]?.mentions));
    const avgPosition = totals[0]?.avg_position == null ? null : parseNum(totals[0].avg_position);
    const visibilityScore = totalChecks > 0 ? (mentions / totalChecks) * 100 : 0;

    const existing = await this.db.query<{ id: string }>(
      `SELECT id::text as id
       FROM geo_ai_scores
       WHERE user_id = $1::uuid AND brand_name = $2 AND platform = $3
       ORDER BY last_computed DESC
       LIMIT 1`,
      [userId, brandName, platform],
    );

    if (existing[0]?.id) {
      const rows = await this.db.query<{
        id: string;
        userId: string;
        brandName: string;
        platform: string;
        visibilityScore: string | number;
        totalChecks: number;
        mentions: number;
        avgPosition: string | number | null;
        lastComputed: Date | string;
      }>(
        `UPDATE geo_ai_scores
         SET visibility_score = $4::numeric,
           total_checks = $5::int,
           mentions = $6::int,
           avg_position = $7::numeric,
           last_computed = NOW()
         WHERE id = $1::uuid AND user_id = $2::uuid AND brand_name = $3 AND platform = $8
         RETURNING id::text as id,
           user_id::text as "userId",
           brand_name as "brandName",
           platform,
           visibility_score as "visibilityScore",
           total_checks as "totalChecks",
           mentions,
           avg_position as "avgPosition",
           last_computed as "lastComputed"`,
        [existing[0].id, userId, brandName, visibilityScore, totalChecks, mentions, avgPosition, platform],
      );
      const r = rows[0];
      return {
        id: r.id,
        userId: r.userId,
        brandName: r.brandName,
        platform: r.platform,
        visibilityScore: parseNum(r.visibilityScore),
        totalChecks: r.totalChecks,
        mentions: r.mentions,
        avgPosition: r.avgPosition == null ? null : parseNum(r.avgPosition),
        lastComputed: typeof r.lastComputed === "string" ? r.lastComputed : r.lastComputed.toISOString(),
      };
    }

    const rows = await this.db.query<{
      id: string;
      userId: string;
      brandName: string;
      platform: string;
      visibilityScore: string | number;
      totalChecks: number;
      mentions: number;
      avgPosition: string | number | null;
      lastComputed: Date | string;
    }>(
      `INSERT INTO geo_ai_scores
        (user_id, brand_name, platform, visibility_score, total_checks, mentions, avg_position, last_computed)
       VALUES ($1::uuid, $2, $3, $4::numeric, $5::int, $6::int, $7::numeric, NOW())
       RETURNING id::text as id,
         user_id::text as "userId",
         brand_name as "brandName",
         platform,
         visibility_score as "visibilityScore",
         total_checks as "totalChecks",
         mentions,
         avg_position as "avgPosition",
         last_computed as "lastComputed"`,
      [userId, brandName, platform, visibilityScore, totalChecks, mentions, avgPosition],
    );
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId,
      brandName: r.brandName,
      platform: r.platform,
      visibilityScore: parseNum(r.visibilityScore),
      totalChecks: r.totalChecks,
      mentions: r.mentions,
      avgPosition: r.avgPosition == null ? null : parseNum(r.avgPosition),
      lastComputed: typeof r.lastComputed === "string" ? r.lastComputed : r.lastComputed.toISOString(),
    };
  }

  async generateOptimizationReport(userId: string, brandName: string): Promise<OptimizationReport> {
    const checks = await this.db.query<{ platform: string; query_used: string; brand_mentioned: boolean; mention_position: number | null; sentiment: string }>(
      `SELECT platform, query_used, brand_mentioned, mention_position, sentiment
       FROM geo_ai_checks
       WHERE user_id = $1::uuid AND brand_name = $2
       ORDER BY checked_at DESC
       LIMIT 30`,
      [userId, brandName],
    );
    const total = checks.length;
    const mentions = checks.filter((c) => c.brand_mentioned).length;
    const currentScore = total > 0 ? (mentions / total) * 100 : 0;

    const prompt = `Eres consultor GEO (Generative Engine Optimization).
Marca: ${brandName}
Score actual: ${currentScore.toFixed(2)}
Checks recientes: ${JSON.stringify(checks.slice(0, 20))}

Devuelve solo JSON:
{
  "recommendations": ["..."],
  "priorityActions": ["..."]
}`;
    const raw = await this.askLlm(prompt);
    let parsed: { recommendations?: string[]; priorityActions?: string[] };
    try {
      parsed = JSON.parse(extractJsonPayload(raw)) as { recommendations?: string[]; priorityActions?: string[] };
    } catch {
      parsed = {};
    }
    return {
      currentScore,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      priorityActions: Array.isArray(parsed.priorityActions) ? parsed.priorityActions.map(String) : [],
    };
  }

  async runFullAudit(userId: string, brandName: string, industry: string): Promise<FullAuditResult> {
    const queryPrompt = `Genera 5 consultas realistas que haría un cliente del sector "${industry}".
Objetivo: descubrir marcas/proveedores.
Devuelve solo JSON array de strings.`;
    const llmRaw = await this.askLlm(queryPrompt);
    let queries: string[] = [];
    try {
      const parsed = JSON.parse(extractJsonPayload(llmRaw)) as unknown;
      if (Array.isArray(parsed)) queries = parsed.map((q) => String(q).trim()).filter(Boolean).slice(0, 5);
    } catch {
      queries = [];
    }
    if (queries.length === 0) {
      queries = [
        `Mejores empresas de ${industry}`,
        `Qué marca recomiendas para ${industry}`,
        `Top proveedores en ${industry}`,
        `Alternativas líderes en ${industry}`,
        `Comparativa de marcas ${industry}`,
      ];
    }

    const checks: GeoAiCheck[] = [];
    const scores: GeoAiScore[] = [];
    for (const platform of DEFAULT_PLATFORMS) {
      const list = await this.checkBrandVisibility(userId, brandName, industry, queries, platform);
      checks.push(...list);
      scores.push(await this.computeVisibilityScore(userId, brandName, platform));
    }
    return { brandName, industry, queries, checks, scores };
  }

  async getVisibilityHistory(userId: string, brandName: string): Promise<GeoAiScore[]> {
    const rows = await this.db.query<{
      id: string;
      userId: string;
      brandName: string;
      platform: string;
      visibilityScore: string | number;
      totalChecks: number;
      mentions: number;
      avgPosition: string | number | null;
      lastComputed: Date | string;
    }>(
      `SELECT id::text as id,
         user_id::text as "userId",
         brand_name as "brandName",
         platform,
         visibility_score as "visibilityScore",
         total_checks as "totalChecks",
         mentions,
         avg_position as "avgPosition",
         last_computed as "lastComputed"
       FROM geo_ai_scores
       WHERE user_id = $1::uuid AND brand_name = $2
       ORDER BY last_computed DESC`,
      [userId, brandName],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      brandName: r.brandName,
      platform: r.platform,
      visibilityScore: parseNum(r.visibilityScore),
      totalChecks: r.totalChecks,
      mentions: r.mentions,
      avgPosition: r.avgPosition == null ? null : parseNum(r.avgPosition),
      lastComputed: typeof r.lastComputed === "string" ? r.lastComputed : r.lastComputed.toISOString(),
    }));
  }
}

let cachedGeoAiVisibilityService: GeoAiVisibilityService | undefined;

export function getGeoAiVisibilityService(): GeoAiVisibilityService {
  if (!cachedGeoAiVisibilityService) cachedGeoAiVisibilityService = new GeoAiVisibilityService();
  return cachedGeoAiVisibilityService;
}

export function resetGeoAiVisibilityServiceForTests(): void {
  cachedGeoAiVisibilityService = undefined;
}
