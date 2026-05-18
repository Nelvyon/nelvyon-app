import { DbClient } from "../../db/DbClient";
import type { EvalResult } from "./types";
import type { ILlmClient } from "../LlmClient";
import { LlmClient } from "../LlmClient";

type QualityScoreRow = {
  id: string;
  user_id: string;
  agent_id: string;
  attempt: number | string;
  score: number | string;
  feedback: string | null;
  input: unknown;
  output: unknown;
  passed: boolean;
  created_at: Date | string;
};

function n(v: unknown): number {
  const out = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

function parseEvalJson(raw: string): Omit<EvalResult, "attempt"> {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(payload) as {
    score?: unknown;
    breakdown?: Record<string, unknown>;
    feedback?: unknown;
    passed?: unknown;
  };
  return {
    score: Math.max(0, Math.min(100, Math.round(n(parsed.score)))),
    breakdown: {
      especificidad: Math.max(0, Math.min(20, Math.round(n(parsed.breakdown?.especificidad)))),
      calidad_profesional: Math.max(0, Math.min(20, Math.round(n(parsed.breakdown?.calidad_profesional)))),
      accionabilidad: Math.max(0, Math.min(20, Math.round(n(parsed.breakdown?.accionabilidad)))),
      originalidad: Math.max(0, Math.min(20, Math.round(n(parsed.breakdown?.originalidad)))),
      impacto_comercial: Math.max(0, Math.min(20, Math.round(n(parsed.breakdown?.impacto_comercial)))),
    },
    feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
    passed: Boolean(parsed.passed) || n(parsed.score) >= 99,
  };
}

function buildEvalPrompt(agentId: string, sector: string, input: unknown, output: unknown): string {
  return `Eres el evaluador de calidad élite mundial de NELVYON.
Evalúa este output de marketing con criterios del top
1% mundial. Sector: ${sector}. Agente: ${agentId}.

INPUT:
${JSON.stringify(input)}

OUTPUT:
${JSON.stringify(output)}

CRITERIOS (cada uno 0-20 puntos, total 0-100):
1. ESPECIFICIDAD — ¿Es 100% específico para este cliente
   y sector? ¿Podría aplicarse a otro cliente?
   (0=genérico, 20=único e irrepetible)
2. CALIDAD PROFESIONAL — ¿Lo firmaría la mejor agencia
   del mundo? ¿Hay frases de relleno o clichés?
   (0=IA genérica, 20=experto senior)
3. ACCIONABILIDAD — ¿El cliente puede ejecutarlo
   inmediatamente? ¿Tiene pasos concretos?
   (0=vago, 20=listo para ejecutar)
4. ORIGINALIDAD — ¿Sorprende? ¿Aporta algo inesperado?
   (0=predecible, 20=wow)
5. IMPACTO COMERCIAL — ¿Generará resultados medibles?
   ¿Orientado a conversión real?
   (0=decorativo, 20=orientado a revenue)

OUTPUT JSON OBLIGATORIO:
{
  "score": <0-100>,
  "breakdown": {
    "especificidad": <0-20>,
    "calidad_profesional": <0-20>,
    "accionabilidad": <0-20>,
    "originalidad": <0-20>,
    "impacto_comercial": <0-20>
  },
  "feedback": "<qué mejorar exactamente, muy específico>",
  "passed": <true si score >= 99>
}`;
}

export class QualityEvaluatorService {
  constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async evaluate(userId: string, agentId: string, sector: string, input: unknown, output: unknown, attempt = 1): Promise<EvalResult> {
    const prompt = buildEvalPrompt(agentId, sector, input, output);
    const raw = await this.llm.complete(prompt, { model: "o3", temperature: 0.1, maxTokens: 1000 });
    const parsed = parseEvalJson(raw);
    await DbClient.getInstance().query<QualityScoreRow>(
      `INSERT INTO quality_scores (user_id, agent_id, attempt, score, feedback, input, output, passed, created_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, now())`,
      [userId, agentId, attempt, parsed.score, parsed.feedback, JSON.stringify(input), JSON.stringify(output), parsed.passed],
    );
    return { ...parsed, attempt };
  }

  async evaluateAndImprove(
    userId: string,
    agentId: string,
    sector: string,
    input: unknown,
    output: unknown,
    runFn: (input: unknown, feedbackInstructions: string) => Promise<unknown>,
    maxAttempts = 3,
  ): Promise<{ output: unknown; score: number; attempts: number }> {
    let currentOutput = output;
    let bestOutput = output;
    let bestScore = -1;
    let attempts = 0;
    for (let i = 1; i <= maxAttempts; i++) {
      attempts = i;
      const evalResult = await this.evaluate(userId, agentId, sector, input, currentOutput, i);
      if (evalResult.score > bestScore) {
        bestScore = evalResult.score;
        bestOutput = currentOutput;
      }
      if (evalResult.passed) return { output: currentOutput, score: evalResult.score, attempts: i };
      if (i < maxAttempts) {
        const feedbackPrompt = `Mejora el output anterior para ${agentId} en sector ${sector}.\nFeedback exacto:\n${evalResult.feedback}\nAplica cambios concretos y medibles.`;
        currentOutput = await runFn(input, feedbackPrompt);
      }
    }
    return { output: bestOutput, score: bestScore, attempts };
  }

  async getScores(
    userId: string,
    filters?: { agentId?: string; passed?: boolean; dateFrom?: string },
  ): Promise<Array<{ agentId: string; score: number; attempt: number; passed: boolean; createdAt: string }>> {
    const where = ["user_id = $1::uuid"];
    const params: unknown[] = [userId];
    let i = 2;
    if (filters?.agentId?.trim()) {
      where.push(`agent_id = $${i}`);
      params.push(filters.agentId.trim());
      i++;
    }
    if (typeof filters?.passed === "boolean") {
      where.push(`passed = $${i}`);
      params.push(filters.passed);
      i++;
    }
    if (filters?.dateFrom) {
      where.push(`created_at >= $${i}::timestamptz`);
      params.push(filters.dateFrom);
      i++;
    }
    const rows = await DbClient.getInstance().query<QualityScoreRow>(
      `SELECT id, user_id, agent_id, attempt, score, feedback, input, output, passed, created_at
       FROM quality_scores
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC`,
      params,
    );
    return rows.map((r) => ({
      agentId: r.agent_id,
      score: n(r.score),
      attempt: n(r.attempt),
      passed: Boolean(r.passed),
      createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    }));
  }
}
