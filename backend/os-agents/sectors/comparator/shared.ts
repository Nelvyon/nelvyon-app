import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ComparatorInput {
  userId: string;
  sector: string;
  clientName: string;
  beforeMetrics: Record<string, string>;
  afterMetrics: Record<string, string>;
  period?: string;
}

export interface ComparatorOutput {
  agentId: string;
  content: string;
  score: number;
  improvements: string[];
  visualData: string[];
}

function parseJson<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${label}: JSON inválido`);
  }
}

export function llmOpts(agentId: string, temperature: number): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseComparatorLlmJson(raw: string, label: string): Omit<ComparatorOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; improvements?: unknown; visualData?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const imp = p.improvements;
  const improvements = Array.isArray(imp)
    ? imp.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const vd = p.visualData;
  const visualData = Array.isArray(vd)
    ? vd.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, improvements, visualData };
}

export function buildTransformPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ComparatorInput;
}): string {
  const before =
    params.input.beforeMetrics && Object.keys(params.input.beforeMetrics).length > 0
      ? JSON.stringify(params.input.beforeMetrics, null, 0)
      : "{}";
  const after =
    params.input.afterMetrics && Object.keys(params.input.afterMetrics).length > 0
      ? JSON.stringify(params.input.afterMetrics, null, 0)
      : "{}";
  const period = params.input.period?.trim() ? params.input.period.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK TRANSFORM (top 1% antes/después):
- **Then**: situación previa con contexto y baseline honesto.
- **Results**: resultados posteriores alineados a las métricas aportadas.
- **Achieved**: logros concretos atribuibles (sin inflar cifras).
- **Numbers**: cifras del brief; si faltan, marcar supuestos explícitos.
- **Show**: narrativa o visual que haga legible el salto.
- **Frame**: encuadre para stakeholders (negocio, no jerga vacía).
- **Own**: transparencia metodológica y límites del análisis.
- **Result**: síntesis del impacto.
- **More**: siguiente paso o mejora continua.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Cliente: ${params.input.clientName}
- Período: ${period}
- Métricas ANTES (clave→valor): ${before}
- Métricas DESPUÉS (clave→valor): ${after}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"improvements":["mejoras o deltas narrados"],"visualData":["datos clave para gráfico o slide"]}`;
}

export async function runComparatorAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ComparatorInput,
  temperature: number,
): Promise<ComparatorOutput> {
  const prompt = buildTransformPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseComparatorLlmJson(raw, agentId);
  const out: ComparatorOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultComparatorLlm(): ILlmClient {
  return LlmClient.getInstance();
}
