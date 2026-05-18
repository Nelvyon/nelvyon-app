import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface OnboardingInput {
  userId: string;
  sector: string;
  productName: string;
  userRole?: string;
  planType?: string;
  completedSteps?: string[];
}

export interface OnboardingOutput {
  agentId: string;
  content: string;
  score: number;
  steps: string[];
  nextActions: string[];
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

export function parseOnboardingLlmJson(raw: string, label: string): Omit<OnboardingOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; steps?: unknown; nextActions?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const s = p.steps;
  const steps = Array.isArray(s)
    ? s.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const na = p.nextActions;
  const nextActions = Array.isArray(na)
    ? na.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, steps, nextActions };
}

export function buildActivatePrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: OnboardingInput;
}): string {
  const role = params.input.userRole?.trim() ? params.input.userRole.trim() : "usuario estándar";
  const plan = params.input.planType?.trim() ? params.input.planType.trim() : "no indicado";
  const done =
    params.input.completedSteps?.length && params.input.completedSteps.length > 0
      ? params.input.completedSteps.join(", ")
      : "ninguno aún";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK ACTIVATE (top 1% onboarding guiado):
- **Awareness**: qué puede lograr y por qué ahora.
- **Clarity**: pasos sin ambigüedad; una acción principal por pantalla.
- **Trust**: permisos y datos con contexto y beneficios claros.
- **Intention**: alinear intención del usuario con el siguiente paso correcto.
- **Value**: time-to-value mínimo; quick wins medibles.
- **Achieve**: hitos de éxito y celebración sin hype vacío.
- **Track**: métricas de activación y señales de abandono.
- **Expand**: siguiente nivel de profundidad cuando corresponde.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Producto: ${params.input.productName}
- Rol: ${role}
- Plan: ${plan}
- Pasos ya completados: ${done}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"steps":["pasos numerables del flujo"],"nextActions":["acciones siguientes concretas"]}`;
}

export async function runOnboardingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: OnboardingInput,
  temperature: number,
): Promise<OnboardingOutput> {
  const prompt = buildActivatePrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseOnboardingLlmJson(raw, agentId);
  const out: OnboardingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultOnboardingLlm(): ILlmClient {
  return LlmClient.getInstance();
}
