import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface CustomerJourneyInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface CustomerJourneyOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const customerJourneyLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.4,
  maxTokens: 1500,
};

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

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseCustomerJourneyLlmJson(raw: string, label: string): Omit<CustomerJourneyOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const CUSTOMER_JOURNEY_OS_RULES = `CUSTOMER JOURNEY COMPLETO NELVYON OS (v1):
- **Mapeo automático del journey** completo: awareness → consideración → decisión → retención → advocacy (KPIs por etapa).
- **Identificación y eliminación de friction points** en cada etapa (UX, datos, políticas, tiempos de respuesta).
- **Personalización de touchpoints** por segmento y comportamiento (consentimiento, frecuencia, preferencias canal).
- **Automatización de nurturing** por etapa del funnel (cadencias, contenido, límites anti-spam, opt-out).
- **Recuperación automática** de clientes perdidos en cada fase (win-back, carrito, churn temprano; ética y transparencia).
- **Medición de conversión por etapa** con alertas (embudo, cohortes, anomalías, atribución descriptiva).
- **Optimización continua** del journey por datos reales (experimentos, guardrails, no manipulación oscura).
- **Integración omnicanal**: email, SMS, web, app, voz (identidad cliente unificada, consistencia mensaje, compliance).`;

export function buildCustomerJourneyPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: CustomerJourneyInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${CUSTOMER_JOURNEY_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Negocio / unidad: ${params.input.businessName}
- Datos / fuentes: ${services}
- Horizonte / mercados: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runCustomerJourneyAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: CustomerJourneyInput,
): Promise<CustomerJourneyOutput> {
  const prompt = buildCustomerJourneyPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, customerJourneyLlmOpts);
  const parsed = parseCustomerJourneyLlmJson(raw, agentId);
  const out: CustomerJourneyOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "customerjourney", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultCustomerJourneyLlm(): ILlmClient {
  return LlmClient.getInstance();
}
