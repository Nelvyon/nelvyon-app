import { DbClient } from "../../db/DbClient";
import type { ILlmClient } from "../LlmClient";
import { LlmClient } from "../LlmClient";
import type { AgentLearning, AgentOutcome } from "./types";

type OutcomeRow = {
  id: string;
  user_id: string;
  agent_id: string;
  sector: string;
  input: unknown;
  output: unknown;
  quality_score: number | string | null;
  outcome_type: string | null;
  outcome_value: number | string;
  feedback: string | null;
  created_at: Date | string;
};

type LearningRow = {
  id: string;
  agent_id: string;
  sector: string;
  pattern: string;
  confidence: number | string | null;
  sample_size: number | string | null;
  prompt_improvement: string | null;
  applied: boolean;
  created_at: Date | string;
};

function n(v: unknown): number {
  const out = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function rowToOutcome(r: OutcomeRow): AgentOutcome {
  return {
    id: r.id,
    userId: r.user_id,
    agentId: r.agent_id,
    sector: r.sector,
    input: r.input,
    output: r.output,
    qualityScore: r.quality_score == null ? null : n(r.quality_score),
    outcomeType: r.outcome_type,
    outcomeValue: n(r.outcome_value),
    feedback: r.feedback,
    createdAt: toIso(r.created_at),
  };
}

function rowToLearning(r: LearningRow): AgentLearning {
  return {
    id: r.id,
    agentId: r.agent_id,
    sector: r.sector,
    pattern: r.pattern,
    confidence: n(r.confidence),
    sampleSize: Math.round(n(r.sample_size)),
    promptImprovement: r.prompt_improvement ?? "",
    applied: Boolean(r.applied),
    createdAt: toIso(r.created_at),
  };
}

function parseLearningJson(raw: string): { patterns: string[]; improvements: string[]; confidence: number } {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(payload) as {
    patterns?: unknown;
    improvements?: unknown;
    confidence?: unknown;
  };
  return {
    patterns: Array.isArray(parsed.patterns) ? parsed.patterns.filter((x): x is string => typeof x === "string") : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((x): x is string => typeof x === "string") : [],
    confidence: Math.max(0, Math.min(1, n(parsed.confidence))),
  };
}

function buildAnalyzePrompt(agentId: string, sector: string, outcomes: AgentOutcome[]): string {
  return `Analiza estos ${outcomes.length} outcomes reales del agente ${agentId}
en el sector ${sector}.
Identifica:
1. Qué patrones en input/output correlacionan con
   outcome_type conversion o reply (éxito)
2. Qué patrones correlacionan con ignored o rejected
   (fracaso)
3. Qué mejoras concretas al prompt aumentarían el
   éxito basándote en los datos reales
Devuelve JSON:
{ patterns: string[], improvements: string[],
  confidence: number }

OUTCOMES:
${JSON.stringify(outcomes)}`;
}

export class LearningService {
  constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async recordOutcome(
    userId: string,
    agentId: string,
    sector: string,
    input: unknown,
    output: unknown,
    outcomeType: string,
    outcomeValue = 0,
    feedback?: string,
  ): Promise<void> {
    await DbClient.getInstance().query(
      `INSERT INTO agent_outcomes
       (user_id, agent_id, sector, input, output, quality_score, outcome_type, outcome_value, feedback, created_at)
       VALUES
       ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, NULL, $6, $7, $8, now())`,
      [userId, agentId, sector, JSON.stringify(input), JSON.stringify(output), outcomeType, outcomeValue, feedback ?? null],
    );
  }

  async analyzePatternsForAgent(agentId: string, sector: string): Promise<AgentLearning[]> {
    const rows = await DbClient.getInstance().query<OutcomeRow>(
      `SELECT id, user_id, agent_id, sector, input, output, quality_score, outcome_type, outcome_value, feedback, created_at
       FROM agent_outcomes
       WHERE agent_id = $1 AND sector = $2
       ORDER BY created_at DESC`,
      [agentId, sector],
    );
    const outcomes = rows.map(rowToOutcome);
    if (outcomes.length < 10) throw new Error("Se requieren mínimo 10 outcomes");

    const raw = await this.llm.complete(buildAnalyzePrompt(agentId, sector, outcomes), {
      model: "o3",
      temperature: 0.1,
      maxTokens: 2000,
      fallback: "gpt-4o",
    });
    const parsed = parseLearningJson(raw);
    const lines = parsed.improvements.length > 0 ? parsed.improvements : parsed.patterns;
    const inserted: AgentLearning[] = [];
    for (const line of lines) {
      const learningRows = await DbClient.getInstance().query<LearningRow>(
        `INSERT INTO agent_learnings
         (agent_id, sector, pattern, confidence, sample_size, prompt_improvement, applied, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, now())
         RETURNING id, agent_id, sector, pattern, confidence, sample_size, prompt_improvement, applied, created_at`,
        [agentId, sector, line, parsed.confidence, outcomes.length, line],
      );
      if (learningRows[0]) inserted.push(rowToLearning(learningRows[0]));
    }
    return inserted;
  }

  async applyLearnings(agentId: string, sector: string): Promise<void> {
    const rows = await DbClient.getInstance().query<LearningRow>(
      `SELECT id, agent_id, sector, pattern, confidence, sample_size, prompt_improvement, applied, created_at
       FROM agent_learnings
       WHERE agent_id = $1 AND sector = $2 AND applied = false AND confidence > 0.7
       ORDER BY confidence DESC, created_at ASC`,
      [agentId, sector],
    );
    for (const row of rows) {
      const learning = rowToLearning(row);
      const promptImprovement = `### APRENDIZAJE REAL (basado en ${learning.sampleSize} casos reales)\n${learning.promptImprovement}`;
      await DbClient.getInstance().query(
        `UPDATE agent_learnings SET prompt_improvement = $2, applied = true WHERE id = $1::uuid`,
        [learning.id, promptImprovement],
      );
    }
  }

  async autoLearnCycle(): Promise<void> {
    const groups = await DbClient.getInstance().query<{ agent_id: string; sector: string; c: string }>(
      `SELECT agent_id, sector, COUNT(*)::text AS c
       FROM agent_outcomes
       GROUP BY agent_id, sector
       HAVING COUNT(*) >= 10`,
    );
    for (const g of groups) {
      try {
        await this.analyzePatternsForAgent(g.agent_id, g.sector);
        await this.applyLearnings(g.agent_id, g.sector);
      } catch {
        // ciclo silencioso por diseño
      }
    }
  }

  async getInsights(userId: string): Promise<AgentLearning[]> {
    const rows = await DbClient.getInstance().query<LearningRow>(
      `SELECT l.id, l.agent_id, l.sector, l.pattern, l.confidence, l.sample_size, l.prompt_improvement, l.applied, l.created_at
       FROM agent_learnings l
       WHERE EXISTS (
         SELECT 1 FROM agent_outcomes o
         WHERE o.agent_id = l.agent_id AND o.sector = l.sector AND o.user_id = $1::uuid
       )
       ORDER BY l.created_at DESC`,
      [userId],
    );
    return rows.map(rowToLearning);
  }

  async getLearningStats(userId: string): Promise<{
    totalOutcomes: number;
    nextCycleAt: string;
    byAgent: Array<{ agentId: string; outcomes: number; successRate: number; improvementsApplied: number }>;
  }> {
    const outcomeRows = await DbClient.getInstance().query<{ agent_id: string; c: string; success: string }>(
      `SELECT agent_id, COUNT(*)::text AS c,
          COALESCE(SUM(CASE WHEN outcome_type IN ('reply','conversion','click','open') THEN 1 ELSE 0 END),0)::text AS success
       FROM agent_outcomes
       WHERE user_id = $1::uuid
       GROUP BY agent_id`,
      [userId],
    );
    const improvementRows = await DbClient.getInstance().query<{ agent_id: string; c: string }>(
      `SELECT l.agent_id, COUNT(*)::text AS c
       FROM agent_learnings l
       WHERE l.applied = true
         AND EXISTS (
           SELECT 1 FROM agent_outcomes o
           WHERE o.agent_id = l.agent_id AND o.sector = l.sector AND o.user_id = $1::uuid
         )
       GROUP BY l.agent_id`,
      [userId],
    );
    const appliedMap = new Map(improvementRows.map((r) => [r.agent_id, n(r.c)]));
    const byAgent = outcomeRows.map((r) => {
      const outcomes = n(r.c);
      const success = n(r.success);
      return {
        agentId: r.agent_id,
        outcomes,
        successRate: outcomes ? (success / outcomes) * 100 : 0,
        improvementsApplied: appliedMap.get(r.agent_id) ?? 0,
      };
    });
    const totalOutcomes = byAgent.reduce((s, x) => s + x.outcomes, 0);
    const nextCycle = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return { totalOutcomes, nextCycleAt: nextCycle, byAgent };
  }
}

export const learningService = new LearningService();
