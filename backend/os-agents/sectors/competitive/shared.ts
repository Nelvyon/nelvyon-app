import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface CompetitiveInput {
  userId: string;
  sector: string;
  competitorUrl: string;
  ownBrand: string;
  ownMetrics?: Record<string, string>;
}

export interface CompetitiveOutput {
  agentId: string;
  content: string;
  score: number;
  insights: string[];
}

export function parseJson<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${label}: JSON inválido`);
  }
}

/** ModelRouter + overrides élite solicitud: gpt-4.1, fallback gpt-4o, 2000 tokens. */
export function llmOpts(agentId: string, temperature = 0.2): LlmOptions {
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

export function parseCompetitiveLlmJson(raw: string, label: string): Omit<CompetitiveOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; insights?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const ins = p.insights;
  const insights = Array.isArray(ins)
    ? ins.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, insights };
}

export function buildActPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: CompetitiveInput;
}): string {
  const m = params.input.ownMetrics;
  const metricsLine =
    m && Object.keys(m).length > 0
      ? `Métricas propias (clave/valor): ${JSON.stringify(m)}`
      : "Métricas propias: no suministradas.";
  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK ACT (top 1%):
- **Analyze**: descompón señales del competidor y del mercado con rigor; cita supuestos explícitos si faltan datos.
- **Compare**: contraste directo ${params.input.ownBrand} vs URL competidor ${params.input.competitorUrl} en dimensiones relevantes.
- **Tactical**: prioriza 3–5 movimientos concretos (qué hacer, por qué, en qué orden) medibles en 14–30 días.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector cliente: ${params.input.sector}
- Marca propia: ${params.input.ownBrand}
- URL competidor: ${params.input.competitorUrl}
- ${metricsLine}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"string detallada en español","score":0-100,"insights":["mínimo 3 strings accionables"]}`;
}

export async function runCompetitiveAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: CompetitiveInput,
): Promise<CompetitiveOutput> {
  const prompt = buildActPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, 0.2));
  const parsed = parseCompetitiveLlmJson(raw, agentId);
  const out: CompetitiveOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* opcional si no hay DB */
  }
  return out;
}

export function getDefaultCompetitiveLlm(): ILlmClient {
  return LlmClient.getInstance();
}
