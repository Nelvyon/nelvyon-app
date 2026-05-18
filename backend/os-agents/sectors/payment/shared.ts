import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface PaymentInput {
  userId: string;
  sector: string;
  clientName: string;
  amountDue: string;
  daysPastDue?: number;
  previousAttempts?: number;
  planType?: string;
}

export interface PaymentOutput {
  agentId: string;
  content: string;
  score: number;
  nextAction: string;
  messages: string[];
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

export function parsePaymentLlmJson(raw: string, label: string): Omit<PaymentOutput, "agentId"> {
  const p = parseJson<{
    content?: unknown;
    score?: unknown;
    nextAction?: unknown;
    messages?: unknown;
  }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const nextAction = typeof p.nextAction === "string" ? p.nextAction : String(p.nextAction ?? "");
  const m = p.messages;
  const messages = Array.isArray(m)
    ? m.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, nextAction, messages };
}

export function buildRecoverPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PaymentInput;
}): string {
  const days =
    typeof params.input.daysPastDue === "number" && Number.isFinite(params.input.daysPastDue)
      ? String(params.input.daysPastDue)
      : "no indicado";
  const attempts =
    typeof params.input.previousAttempts === "number" && Number.isFinite(params.input.previousAttempts)
      ? String(params.input.previousAttempts)
      : "no indicado";
  const plan = params.input.planType?.trim() ? params.input.planType.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK RECOVER (top 1% cobranza ética y compliant):
- **Risk**: evaluar riesgo de impago y sensibilidad del cliente sin discriminación.
- **Escalate**: escalar comunicación con proporcionalidad y registro de intentos.
- **Communicate**: claridad, respeto y canales adecuados; evitar amenazas indebidas.
- **Options**: ofrecer vías reales (plan de pago, pausa, método alternativo).
- **Value**: recordar valor del servicio y términos sin coerción manipulativa.
- **Engage**: mantener puerta abierta a diálogo y acuerdo.
- **Resolve**: objetivo de recuperación sostenible o cierre ordenado del contrato.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Cliente: ${params.input.clientName}
- Importe adeudado: ${params.input.amountDue}
- Días de mora: ${days}
- Intentos previos: ${attempts}
- Plan: ${plan}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"nextAction":"acción recomendada siguiente","messages":["mensajes o piezas de comunicación"]}`;
}

export async function runPaymentAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: PaymentInput,
): Promise<PaymentOutput> {
  const prompt = buildRecoverPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId));
  const parsed = parsePaymentLlmJson(raw, agentId);
  const out: PaymentOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPaymentLlm(): ILlmClient {
  return LlmClient.getInstance();
}
