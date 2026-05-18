import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface MultimodalInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface MultimodalOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const multimodalLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.5,
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

export function parseMultimodalLlmJson(raw: string, label: string): Omit<MultimodalOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const MULTIMODAL_OS_RULES = `IA MULTIMODAL NELVYON OS (v1):
- Procesamiento combinado texto + imagen + audio + vídeo en una sola petición (alineación modalidades, límites de contexto).
- Análisis de imágenes y documentos subidos por el cliente (OCR conceptual, PII, retención y consentimiento).
- Transcripción y análisis de audio/vídeo (diarización descriptiva, timestamps, resumen accionable).
- Generación de respuestas que combinan múltiples formatos (brief unificado, anexos sugeridos, accesibilidad).
- Extracción de datos estructurados desde documentos no estructurados (esquema, validación, trazabilidad de campos).
- Comprensión de contexto visual para campañas (layout, jerarquía, CTA, coherencia marca).
- Traducción multimodal (voz→texto→otro idioma→voz) con tono y límites regulatorios.
- Análisis de creatividades publicitarias existentes (hook, legibilidad, safe zones, riesgo compliance).`;

export function buildMultimodalPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: MultimodalInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${MULTIMODAL_OS_RULES}

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

export async function runMultimodalAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: MultimodalInput,
): Promise<MultimodalOutput> {
  const prompt = buildMultimodalPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, multimodalLlmOpts);
  const parsed = parseMultimodalLlmJson(raw, agentId);
  const out: MultimodalOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "multimodal", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultMultimodalLlm(): ILlmClient {
  return LlmClient.getInstance();
}
