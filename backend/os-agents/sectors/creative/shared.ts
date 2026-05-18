import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface CreativeInput {
  userId: string;
  sector: string;
  brand: string;
  format: string;
  targetAudience: string;
  goal?: string;
  tone?: string;
}

export interface CreativeOutput {
  agentId: string;
  content: string;
  score: number;
  variants: string[];
  formats: string[];
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

export function llmOpts(agentId: string, temperature = 0.8): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2500,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseCreativeLlmJson(raw: string, label: string): Omit<CreativeOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; variants?: unknown; formats?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const v = p.variants;
  const variants = Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const f = p.formats;
  const formats = Array.isArray(f)
    ? f.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, variants, formats };
}

export function buildCreatePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: CreativeInput;
}): string {
  const goal = params.input.goal?.trim() ? params.input.goal.trim() : "no indicado (explicitar supuestos)";
  const tone = params.input.tone?.trim() ? params.input.tone.trim() : "marca coherente y memorable";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK CREATE (top 1%):
- **Concept**: idea central diferenciada y defendible.
- **Resonance**: encaje cultural y audiencia (sin clichés vacíos).
- **Emotion**: activación emocional ética alineada a la marca.
- **Action**: siguiente paso claro (click, reply, guardar, comprar).
- **Test**: hipótesis de mensaje/formato a validar.
- **Evolve**: cómo iterar según datos sin matar la voz.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Marca: ${params.input.brand}
- Formato solicitado: ${params.input.format}
- Audiencia: ${params.input.targetAudience}
- Objetivo: ${goal}
- Tono: ${tone}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro o piezas en español salvo brief","score":0-100,"variants":["variantes creativas"],"formats":["formatos de salida sugeridos"]}`;
}

export async function runCreativeAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: CreativeInput,
): Promise<CreativeOutput> {
  const prompt = buildCreatePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, 0.8));
  const parsed = parseCreativeLlmJson(raw, agentId);
  const out: CreativeOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultCreativeLlm(): ILlmClient {
  return LlmClient.getInstance();
}
