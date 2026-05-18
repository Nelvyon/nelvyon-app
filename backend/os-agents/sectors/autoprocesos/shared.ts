import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface AutoprocesosInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface AutoprocesosOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const autoprocesosLlmOpts: LlmOptions = {
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

export function parseAutoprocesosLlmJson(raw: string, label: string): Omit<AutoprocesosOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const AUTOPROCESOS_OS_RULES = `AUTOMATIZACIÓN PROCESOS INTERNOS NELVYON OS (v1):
- Automatización de procesos de negocio con human-in-the-loop donde haya riesgo legal o financiero.
- Workflows n8n / Zapier / Make nativos IA (triggers, idempotencia, reintentos, observabilidad).
- Generación automática de reportes y dashboards internos (KPIs, SLAs, freshness de datos).
- Sincronización de datos entre plataformas (CRM, ERP, email) con mapeo de campos y deduplicación.
- Alertas inteligentes por anomalías en KPIs (umbrales, seasonality, falsos positivos).
- Tareas repetitivas: facturas, contratos, emails de seguimiento (plantillas, aprobaciones, auditoría).
- Integración con APIs externas low-code (auth, rate limits, versionado, secretos fuera del prompt).
- Optimización continua de flujos por IA (experimentos, métricas de ciclo, deuda de automatización).`;

export function buildAutoprocesosPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: AutoprocesosInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${AUTOPROCESOS_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / unidad: ${params.input.businessName}
- Stack / herramientas: ${services}
- Procesos / sistemas: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runAutoprocesosAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: AutoprocesosInput,
): Promise<AutoprocesosOutput> {
  const prompt = buildAutoprocesosPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, autoprocesosLlmOpts);
  const parsed = parseAutoprocesosLlmJson(raw, agentId);
  const out: AutoprocesosOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "autoprocesos", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultAutoprocesosLlm(): ILlmClient {
  return LlmClient.getInstance();
}
