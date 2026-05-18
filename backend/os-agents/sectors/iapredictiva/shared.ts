import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface IaPredictivaInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface IaPredictivaOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const iaPredictivaLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.3,
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

export function parseIaPredictivaLlmJson(raw: string, label: string): Omit<IaPredictivaOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const IA_PREDICTIVA_OS_RULES = `IA PREDICTIVA NEGOCIO NELVYON OS (v1):
- Predicción de churn con horizonte 30–60 días (señales, cohortes, intervenciones éticas; no discriminación prohibida).
- Forecast de ventas e ingresos por período (supuestos, intervalos de confianza descriptivos, estacionalidad).
- Detección de anomalías en métricas en tiempo real (baseline, drift, falsos positivos, runbooks).
- Segmentación predictiva por comportamiento futuro (features, privacidad, consentimiento).
- Recomendaciones de producto/servicio personalizadas (transparencia, límites regulatorios sector).
- Predicción de LTV por cliente (supuestos de retención y margen; revisión financiera humana).
- Alertas tempranas de riesgo de negocio (liquidez, concentración, dependencia proveedor placeholder).
- Optimización de inventario y recursos por demanda prevista (stockout/overstock, lead times).`;

export function buildIaPredictivaPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: IaPredictivaInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${IA_PREDICTIVA_OS_RULES}

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

export async function runIaPredictivaAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: IaPredictivaInput,
): Promise<IaPredictivaOutput> {
  const prompt = buildIaPredictivaPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, iaPredictivaLlmOpts);
  const parsed = parseIaPredictivaLlmJson(raw, agentId);
  const out: IaPredictivaOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "iapredictiva", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultIaPredictivaLlm(): ILlmClient {
  return LlmClient.getInstance();
}
