import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LlmClient } from "../os-agents/LlmClient";

export type SentimentLabel = "positive" | "neutral" | "negative";

export type SentimentAnalysis = {
  score: number;
  label: SentimentLabel;
  confidence: number;
  topics: string[];
};

export type SentimentMention = {
  id: string;
  userId: string;
  channel: string;
  text: string;
  score: number;
  label: SentimentLabel;
  confidence: number;
  topics: string[];
  createdAt: string;
};

export type SentimentTrendPoint = { date: string; avgScore: number };
export type SentimentChannelDistribution = {
  channel: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  avgScore: number;
};

export type SentimentStats = {
  avgScore: number;
  totalMentions: number;
  channels: SentimentChannelDistribution[];
  trend: SentimentTrendPoint[];
};

type SentimentMonitorServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseJsonPayload(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

function clampScore(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function clampConfidence(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function heuristic(text: string): SentimentAnalysis {
  const t = text.toLowerCase();
  const pos = ["excelente", "great", "amazing", "good", "encanta", "perfecto", "recommend"].filter((k) => t.includes(k)).length;
  const neg = ["malo", "bad", "terrible", "horrible", "queja", "slow", "delay", "problem"].filter((k) => t.includes(k)).length;
  const raw = pos - neg;
  const score = clampScore(raw / 4);
  const label: SentimentLabel = score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";
  const topics = ["support", "pricing", "quality", "delivery", "ux"].filter((k) => t.includes(k));
  return { score, label, confidence: 0.6, topics };
}

export class SentimentMonitorService {
  constructor(private readonly deps: SentimentMonitorServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async analyzeSentiment(userId: string, text: string, channel: string): Promise<SentimentAnalysis> {
    const prompt = `Analyze sentiment for a customer mention.
UserId: ${userId}
Channel: ${channel}
Text: """${text}"""

Return only JSON:
{
  "score": number between -1 and 1,
  "label": "positive" | "neutral" | "negative",
  "confidence": number between 0 and 1,
  "topics": ["..."]
}`;
    try {
      const out = await this.llm.complete(prompt, { model: "gpt-4o", temperature: 0.1, maxTokens: 500 });
      const parsed = JSON.parse(parseJsonPayload(out)) as Partial<SentimentAnalysis>;
      const score = clampScore(num(parsed.score));
      const confidence = clampConfidence(num(parsed.confidence));
      const topics = Array.isArray(parsed.topics) ? parsed.topics.filter((t): t is string => typeof t === "string").slice(0, 8) : [];
      const label: SentimentLabel = parsed.label === "positive" || parsed.label === "negative" || parsed.label === "neutral"
        ? parsed.label
        : score > 0.2
          ? "positive"
          : score < -0.2
            ? "negative"
            : "neutral";
      return { score, label, confidence, topics };
    } catch {
      return heuristic(text);
    }
  }

  async saveMention(userId: string, channel: string, text: string, metadata: Record<string, unknown> = {}): Promise<SentimentMention> {
    const analysis = await this.analyzeSentiment(userId, text, channel);
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      channel: string;
      text: string;
      score: string | number;
      label: SentimentLabel;
      confidence: string | number;
      topics: string[] | null;
      created_at: Date | string;
    }>(
      `INSERT INTO sentiment_mentions (user_id, channel, text, score, label, confidence, topics, metadata, created_at)
       VALUES ($1::uuid, $2, $3, $4::numeric, $5, $6::numeric, $7::jsonb, $8::jsonb, NOW())
       RETURNING id::text, user_id::text, channel, text, score, label, confidence, topics, created_at`,
      [userId, channel, text, analysis.score, analysis.label, analysis.confidence, JSON.stringify(analysis.topics), JSON.stringify(metadata)],
    );
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      channel: r.channel,
      text: r.text,
      score: num(r.score),
      label: r.label,
      confidence: num(r.confidence),
      topics: Array.isArray(r.topics) ? r.topics : [],
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    };
  }

  async getMentions(
    userId: string,
    filters?: { channel?: string; label?: SentimentLabel; fromDate?: string; page?: number; pageSize?: number },
  ): Promise<{ items: SentimentMention[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, Math.round(filters?.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Math.round(filters?.pageSize ?? 20)));
    const where: string[] = ["user_id = $1::uuid"];
    const params: Array<string | number> = [userId];
    if (filters?.channel) {
      where.push(`channel = $${params.length + 1}`);
      params.push(filters.channel);
    }
    if (filters?.label) {
      where.push(`label = $${params.length + 1}`);
      params.push(filters.label);
    }
    if (filters?.fromDate) {
      where.push(`created_at >= $${params.length + 1}::timestamptz`);
      params.push(filters.fromDate);
    }
    const countRows = await this.db.query<{ total: string }>(`SELECT COUNT(*)::text as total FROM sentiment_mentions WHERE ${where.join(" AND ")}`, params);
    const total = Math.max(0, Math.round(num(countRows[0]?.total)));
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      channel: string;
      text: string;
      score: string | number;
      label: SentimentLabel;
      confidence: string | number;
      topics: string[] | null;
      created_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, channel, text, score, label, confidence, topics, created_at
       FROM sentiment_mentions
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}::int
       OFFSET $${params.length + 2}::int`,
      [...params, pageSize, (page - 1) * pageSize],
    );
    return {
      items: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        channel: r.channel,
        text: r.text,
        score: num(r.score),
        label: r.label,
        confidence: num(r.confidence),
        topics: Array.isArray(r.topics) ? r.topics : [],
        createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getStats(userId: string, period = "30d"): Promise<SentimentStats> {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const summaryRows = await this.db.query<{ avg_score: string; total: string }>(
      `SELECT COALESCE(AVG(score), 0)::text as avg_score, COUNT(*)::text as total
       FROM sentiment_mentions
       WHERE user_id = $1::uuid
         AND created_at >= NOW() - ($2::int || ' days')::interval`,
      [userId, days],
    );
    const channelRows = await this.db.query<{
      channel: string;
      total: string;
      positive: string;
      neutral: string;
      negative: string;
      avg_score: string;
    }>(
      `SELECT
         channel,
         COUNT(*)::text as total,
         COALESCE(SUM(CASE WHEN label = 'positive' THEN 1 ELSE 0 END), 0)::text as positive,
         COALESCE(SUM(CASE WHEN label = 'neutral' THEN 1 ELSE 0 END), 0)::text as neutral,
         COALESCE(SUM(CASE WHEN label = 'negative' THEN 1 ELSE 0 END), 0)::text as negative,
         COALESCE(AVG(score), 0)::text as avg_score
       FROM sentiment_mentions
       WHERE user_id = $1::uuid
         AND created_at >= NOW() - ($2::int || ' days')::interval
       GROUP BY channel
       ORDER BY channel ASC`,
      [userId, days],
    );
    const trendRows = await this.db.query<{ date: string; avg_score: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date, COALESCE(AVG(score), 0)::text as avg_score
       FROM sentiment_mentions
       WHERE user_id = $1::uuid
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY 1
       ORDER BY 1 ASC`,
      [userId],
    );
    return {
      avgScore: num(summaryRows[0]?.avg_score),
      totalMentions: Math.round(num(summaryRows[0]?.total)),
      channels: channelRows.map((r) => ({
        channel: r.channel,
        total: Math.round(num(r.total)),
        positive: Math.round(num(r.positive)),
        neutral: Math.round(num(r.neutral)),
        negative: Math.round(num(r.negative)),
        avgScore: num(r.avg_score),
      })),
      trend: trendRows.map((r) => ({ date: r.date, avgScore: num(r.avg_score) })),
    };
  }

  async checkAlerts(userId: string): Promise<{ triggered: boolean; avgScore: number; alertId?: string }> {
    const rows = await this.db.query<{ avg_score: string }>(
      `SELECT COALESCE(AVG(score), 0)::text as avg_score
       FROM sentiment_mentions
       WHERE user_id = $1::uuid
         AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId],
    );
    const avgScore = num(rows[0]?.avg_score);
    if (avgScore >= -0.3) return { triggered: false, avgScore };
    const alertRows = await this.db.query<{ id: string }>(
      `INSERT INTO sentiment_alerts (user_id, avg_score, window_hours, status, metadata, created_at)
       VALUES ($1::uuid, $2::numeric, 24, 'active', $3::jsonb, NOW())
       RETURNING id::text`,
      [userId, avgScore, JSON.stringify({ reason: "avg_score_below_threshold", threshold: -0.3 })],
    );
    return { triggered: true, avgScore, alertId: alertRows[0]?.id };
  }

  async getActiveAlerts(userId: string): Promise<Array<{ id: string; avgScore: number; createdAt: string; status: string }>> {
    const rows = await this.db.query<{ id: string; avg_score: string; created_at: Date | string; status: string }>(
      `SELECT id::text, avg_score, created_at, status
       FROM sentiment_alerts
       WHERE user_id = $1::uuid AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      avgScore: num(r.avg_score),
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
      status: r.status,
    }));
  }
}

let cachedSentimentMonitorService: SentimentMonitorService | undefined;

export function getSentimentMonitorService(): SentimentMonitorService {
  if (!cachedSentimentMonitorService) cachedSentimentMonitorService = new SentimentMonitorService();
  return cachedSentimentMonitorService;
}

export function resetSentimentMonitorServiceForTests(): void {
  cachedSentimentMonitorService = undefined;
}
