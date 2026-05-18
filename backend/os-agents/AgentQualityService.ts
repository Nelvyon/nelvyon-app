import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "./OsAgentError";

export interface AgentFeedback {
  id: string;
  userId: string;
  jobId: string;
  resultId: string;
  rating: number;
  feedbackText: string | null;
  sector: string | null;
  createdAt: string;
}

export interface AgentQualityScore {
  id: string;
  serviceType: string;
  sector: string | null;
  avgRating: number;
  totalFeedback: number;
  lastComputed: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: string[];
}

export type AgentQualityServiceDeps = {
  db?: Pick<DbClient, "query">;
};

function sanitizeSector(sector: string): string {
  return sector.trim().toLowerCase();
}

export class AgentQualityService {
  constructor(private readonly deps: AgentQualityServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async submitFeedback(
    userId: string,
    jobId: string,
    resultId: string,
    rating: number,
    feedbackText: string,
    sector: string,
  ): Promise<AgentFeedback> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new OsAgentError("Rating must be an integer between 1 and 5");
    }

    const serviceRows = await this.db.query<{ service_id: string }>(
      `SELECT service_id
       FROM os_jobs
       WHERE job_id = $1
       LIMIT 1`,
      [jobId],
    );
    const serviceType = serviceRows[0]?.service_id ?? "unknown";

    const rows = await this.db.query<AgentFeedback>(
      `INSERT INTO agent_feedback (user_id, job_id, result_id, rating, feedback_text, sector)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
       RETURNING id,
                 user_id::text as "userId",
                 job_id::text as "jobId",
                 result_id::text as "resultId",
                 rating,
                 feedback_text as "feedbackText",
                 sector,
                 created_at as "createdAt"`,
      [userId, jobId, resultId, rating, feedbackText || null, sanitizeSector(sector)],
    );
    const feedback = rows[0];
    if (!feedback) {
      throw new Error("AgentQualityService.submitFeedback: INSERT returned no row");
    }

    await this.recomputeScore(serviceType, sanitizeSector(sector));
    return feedback;
  }

  async recomputeScore(serviceType: string, sector: string): Promise<void> {
    const aggregateRows = await this.db.query<{ avg_rating: string; total_feedback: string }>(
      `SELECT
         COALESCE(AVG(af.rating), 0)::text as avg_rating,
         COUNT(*)::text as total_feedback
       FROM agent_feedback af
       JOIN os_jobs j ON j.job_id = af.job_id::text
       WHERE j.service_id = $1
         AND af.sector = $2`,
      [serviceType, sanitizeSector(sector)],
    );
    const avgRating = Number.parseFloat(aggregateRows[0]?.avg_rating ?? "0");
    const totalFeedback = Number.parseInt(aggregateRows[0]?.total_feedback ?? "0", 10);

    await this.db.query(
      `INSERT INTO agent_quality_scores (service_type, sector, avg_rating, total_feedback, last_computed)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (service_type, sector)
       DO UPDATE SET avg_rating = EXCLUDED.avg_rating,
                     total_feedback = EXCLUDED.total_feedback,
                     last_computed = NOW()`,
      [serviceType, sanitizeSector(sector), avgRating, totalFeedback],
    );
  }

  async getQualityScore(serviceType: string, sector?: string): Promise<AgentQualityScore | null> {
    const rows = await this.db.query<AgentQualityScore>(
      `SELECT id,
              service_type as "serviceType",
              sector,
              COALESCE(avg_rating, 0)::float as "avgRating",
              total_feedback as "totalFeedback",
              last_computed as "lastComputed"
       FROM agent_quality_scores
       WHERE service_type = $1
         AND ($2::text IS NULL OR sector = $2)
       ORDER BY last_computed DESC
       LIMIT 1`,
      [serviceType, sector ? sanitizeSector(sector) : null],
    );
    return rows[0] ?? null;
  }

  async getTopPerformingAgents(limit = 10): Promise<AgentQualityScore[]> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
    return this.db.query<AgentQualityScore>(
      `SELECT id,
              service_type as "serviceType",
              sector,
              COALESCE(avg_rating, 0)::float as "avgRating",
              total_feedback as "totalFeedback",
              last_computed as "lastComputed"
       FROM agent_quality_scores
       ORDER BY avg_rating DESC, total_feedback DESC
       LIMIT $1`,
      [safeLimit],
    );
  }

  async buildEnhancedPrompt(basePrompt: string, serviceType: string, sector: string, context: Record<string, unknown>): Promise<string> {
    const negatives = await this.db.query<{ feedback_text: string | null }>(
      `SELECT af.feedback_text
       FROM agent_feedback af
       JOIN os_jobs j ON j.job_id = af.job_id::text
       WHERE j.service_id = $1
         AND af.sector = $2
         AND af.rating <= 2
       ORDER BY af.created_at DESC
       LIMIT 5`,
      [serviceType, sanitizeSector(sector)],
    );

    if (negatives.length === 0) {
      return `${basePrompt}\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }

    const patterns = negatives
      .map((row) => (row.feedback_text ?? "").trim())
      .filter((text) => text.length > 0)
      .map((text) => `- ${text}`)
      .join("\n");

    return `${basePrompt}

Quality improvement rules:
- Avoid repeating common mistakes from recent client feedback.
- Be specific, practical, and adapted to ${sector}.
- Include actionable next steps and measurable outcomes.

Negative patterns to avoid:
${patterns || "- Generic or low-value output"}

Context:
${JSON.stringify(context, null, 2)}`;
  }

  async validateOutput(output: string, serviceType: string, sector: string): Promise<ValidationResult> {
    const issues: string[] = [];
    if (output.trim().length <= 50) {
      issues.push("Output too short (must be longer than 50 characters)");
    }

    const normalized = output.toLowerCase();
    const commonErrorPatterns = ["lorem ipsum", "todo", "placeholder", "n/a", "sin contenido"];
    for (const pattern of commonErrorPatterns) {
      if (normalized.includes(pattern)) {
        issues.push(`Contains common error pattern: ${pattern}`);
      }
    }

    if (!normalized.includes(serviceType.toLowerCase())) {
      issues.push("Output does not reference the target service type");
    }
    if (!normalized.includes(sector.toLowerCase())) {
      issues.push("Output does not reference the target sector");
    }

    const penalty = Math.min(issues.length * 20, 100);
    const score = Math.max(0, 100 - penalty);
    return {
      valid: issues.length === 0,
      score,
      issues,
    };
  }
}

export const agentQualityService = new AgentQualityService();
