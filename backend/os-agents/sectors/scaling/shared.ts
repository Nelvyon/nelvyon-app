import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ScalingInput {
  userId: string;
  sector: string;
  currentPlan: string;
  usageMetrics: Record<string, string>;
  monthsActive?: number;
  mrr?: string;
}

export interface ScalingOutput {
  agentId: string;
  content: string;
  score: number;
  recommendation: string;
  triggers: string[];
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

export function llmOpts(agentId: string): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature: 0.2,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseScalingLlmJson(raw: string, label: string): Omit<ScalingOutput, "agentId"> {
  const p = parseJson<{
    content?: unknown;
    score?: unknown;
    recommendation?: unknown;
    triggers?: unknown;
  }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const recommendation =
    typeof p.recommendation === "string" ? p.recommendation : String(p.recommendation ?? "");
  const t = p.triggers;
  const triggers = Array.isArray(t)
    ? t.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, recommendation, triggers };
}

export function buildExpandPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ScalingInput;
}): string {
  const metrics =
    params.input.usageMetrics && Object.keys(params.input.usageMetrics).length > 0
      ? JSON.stringify(params.input.usageMetrics, null, 0)
      : "{}";
  const months =
    typeof params.input.monthsActive === "number" && Number.isFinite(params.input.monthsActive)
      ? String(params.input.monthsActive)
      : "no indicado";
  const mrr = params.input.mrr?.trim() ? params.input.mrr.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK EXPAND (top 1% revenue expansion):
- **Evaluate**: evaluar salud de cuenta, uso vs límites y señales de valor.
- **eXamine**: examinar patrones, estacionalidad y riesgos (churn/downgrade).
- **Propose**: propuesta de siguiente mejor acción (upgrade, add-on, annual).
- **Accelerate**: acelerar decisión con pruebas y ROI cuando el brief lo permita.
- **Nurture**: nutrir confianza; transparencia en precio y términos.
- **Drive**: impulsar expansión ética sin presión indebida.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Plan actual: ${params.input.currentPlan}
- Métricas de uso (clave→valor): ${metrics}
- Meses activo: ${months}
- MRR declarado: ${mrr}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"análisis y plan en español salvo brief","score":0-100,"recommendation":"recomendación ejecutiva en una frase o párrafo corto","triggers":["señales o disparadores detectados"]}`;
}

export async function runScalingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ScalingInput,
): Promise<ScalingOutput> {
  const prompt = buildExpandPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId));
  const parsed = parseScalingLlmJson(raw, agentId);
  const out: ScalingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultScalingLlm(): ILlmClient {
  return LlmClient.getInstance();
}
