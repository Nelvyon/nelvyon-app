import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ChurnInput {
  userId: string;
  sector: string;
  contactId: string;
  engagementData: Record<string, string>;
  planType?: string;
  monthsActive?: number;
}

export type ChurnRiskLevel = "low" | "medium" | "high" | "critical";

export interface ChurnOutput {
  agentId: string;
  content: string;
  score: number;
  riskLevel: ChurnRiskLevel;
  actions: string[];
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

/** ModelRouter + overrides élite: gpt-4.1, fallback gpt-4o, 2000 tokens. */
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

/** strategy/analysis → 0.2; outreach/copy (ofertas, secuencias, storytelling) → 0.5 */
export function churnTemperature(agentId: string): number {
  const id = agentId.toLowerCase();
  if (
    id.includes("retention-offer") ||
    id.includes("reengagement") ||
    id.includes("success-story")
  ) {
    return 0.5;
  }
  return 0.2;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeRiskLevel(v: unknown, score: number): ChurnRiskLevel {
  const s = typeof v === "string" ? v.toLowerCase().trim() : "";
  if (s === "low" || s === "medium" || s === "high" || s === "critical") return s;
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function parseChurnLlmJson(raw: string, label: string): Omit<ChurnOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; riskLevel?: unknown; actions?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const riskLevel = normalizeRiskLevel(p.riskLevel, score);
  const act = p.actions;
  const actions = Array.isArray(act)
    ? act.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, riskLevel, actions };
}

export function buildRetainPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ChurnInput;
}): string {
  const eng = JSON.stringify(params.input.engagementData);
  const plan = params.input.planType?.trim() ? params.input.planType.trim() : "no indicado";
  const months =
    typeof params.input.monthsActive === "number" && Number.isFinite(params.input.monthsActive)
      ? String(params.input.monthsActive)
      : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK RETAIN (top 1%):
- **Risk**: cuantifica y contextualiza riesgo de abandajo con incertidumbre explícita.
- **Evidence**: qué datos del contacto sustentan el juicio (engagementData, tenure, plan).
- **Trigger**: qué evento o umbral dispara la intervención ahora (no genérico).
- **Action**: pasos concretos ordenados con owner sugerido y plazo corto.
- **Impact**: efecto esperado en retención/NRR si se ejecuta bien (sin promesas mágicas).
- **Nurture**: cómo dar seguimiento y cerrar el loop de medición.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- contactId: ${params.input.contactId}
- engagementData (clave/valor): ${eng}
- Plan: ${plan}
- Meses activo: ${months}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown).
riskLevel debe ser exactamente uno de: "low", "medium", "high", "critical".
{"content":"string detallada en español","score":0-100,"riskLevel":"low"|"medium"|"high"|"critical","actions":["mínimo 3 acciones"]}`;
}

export async function runChurnAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ChurnInput,
): Promise<ChurnOutput> {
  const prompt = buildRetainPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, churnTemperature(agentId)));
  const parsed = parseChurnLlmJson(raw, agentId);
  const out: ChurnOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* opcional sin DB */
  }
  return out;
}

export function getDefaultChurnLlm(): ILlmClient {
  return LlmClient.getInstance();
}
