import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

export interface InfluencerReachInput {
  userId: string;
  sector: string;
  brand: string;
  targetAudience: string;
  budget?: string;
  platforms?: string[];
}

export interface InfluencerReachOutput {
  agentId: string;
  content: string;
  score: number;
  recommendations: string[];
}

export function parseJsonReach<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${label}: JSON inválido`);
  }
}

export function llmOpts(agentId: string, temperature = 0.5): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature,
  };
}

export function influencerTemperature(agentId: string): number {
  return agentId.includes("outreach") ? 0.5 : 0.45;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseInfluencerReachLlmJson(raw: string, label: string): Omit<InfluencerReachOutput, "agentId"> {
  const p = parseJsonReach<{ content?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, recommendations };
}

export function buildReachPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: InfluencerReachInput;
}): string {
  const plats =
    params.input.platforms && params.input.platforms.length > 0
      ? params.input.platforms.join(", ")
      : "no especificadas (inferir según sector)";
  const budgetLine = params.input.budget?.trim()
    ? `Presupuesto indicativo: ${params.input.budget.trim()}`
    : "Presupuesto: no indicado (explicitar supuestos).";

  return `${params.eliteRole}

FRAMEWORK REACH (top 1%):
- **Research**: fundamentos de audiencia, nicho y contexto competitivo; datos faltantes como supuestos explícitos.
- **Engage**: cómo captar atención auténtica del público y del creador sin forzar la marca.
- **Align**: encaje marca–influencer–mensaje–plataforma con criterios medibles.
- **Convert**: puente hacia acción (CTR, código, landing, UTM); sin prometer resultados irreales.
- **Harvest**: cómo medir, iterar y capitalizar aprendizajes en 30–60 días.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Marca: ${params.input.brand}
- Audiencia objetivo: ${params.input.targetAudience}
- Plataformas: ${plats}
- ${budgetLine}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"string detallada en español","score":0-100,"recommendations":["mínimo 3 acciones concretas"]}`;
}

export async function runInfluencerReachAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: InfluencerReachInput,
): Promise<InfluencerReachOutput> {
  const prompt = buildReachPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, influencerTemperature(agentId)));
  const parsed = parseInfluencerReachLlmJson(raw, agentId);
  const out: InfluencerReachOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultInfluencerReachLlm(): ILlmClient {
  return LlmClient.getInstance();
}
