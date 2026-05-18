import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface TestimonialsInput {
  userId: string;
  sector: string;
  clientName: string;
  result?: string;
  industry?: string;
  challenge?: string;
  solution?: string;
}

export interface TestimonialsOutput {
  agentId: string;
  content: string;
  score: number;
  quotes: string[];
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

export function llmOpts(agentId: string, temperature: number): LlmOptions {
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

export function parseTestimonialsLlmJson(raw: string, label: string): Omit<TestimonialsOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; quotes?: unknown; formats?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const q = p.quotes;
  const quotes = Array.isArray(q)
    ? q.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const f = p.formats;
  const formats = Array.isArray(f)
    ? f.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, quotes, formats };
}

export function buildProofPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: TestimonialsInput;
}): string {
  const result = params.input.result?.trim() ? params.input.result.trim() : "no indicado (inferir con transparencia)";
  const industry = params.input.industry?.trim() ? params.input.industry.trim() : "no indicado";
  const challenge = params.input.challenge?.trim() ? params.input.challenge.trim() : "no indicado";
  const solution = params.input.solution?.trim() ? params.input.solution.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK PROOF (top 1% social proof B2B/B2C):
- **Problem**: problema del cliente con contexto creíble (sin inventar datos sensibles).
- **Result**: resultado medible o cualitativo fuerte, alineado al brief.
- **Outcome**: impacto en negocio o vida del cliente; narrativa clara.
- **Outcome-specific**: detalles verificables y diferenciadores (sin cifras fabricadas).
- **Facts**: hechos, métricas solo si el brief las aporta o se marcan como hipótesis.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Cliente / caso: ${params.input.clientName}
- Industria: ${industry}
- Desafío: ${challenge}
- Solución: ${solution}
- Resultado declarado: ${result}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"quotes":["citas de impacto"],"formats":["formatos de salida sugeridos"]}`;
}

export async function runTestimonialsAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: TestimonialsInput,
  temperature: number,
): Promise<TestimonialsOutput> {
  const prompt = buildProofPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseTestimonialsLlmJson(raw, agentId);
  const out: TestimonialsOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultTestimonialsLlm(): ILlmClient {
  return LlmClient.getInstance();
}
