import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface EcommerceConvInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface EcommerceConvOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const ecommerceConvLlmOpts: LlmOptions = {
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

export function parseEcommerceConvLlmJson(raw: string, label: string): Omit<EcommerceConvOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const ECOMMERCE_CONV_OS_RULES = `ECOMMERCE CONVERSIONAL NELVYON OS (v1):
- Optimización conversional de tiendas online (funnel, CRO, velocidad percibida, trust signals).
- Recuperación de carritos abandonados automática (secuencias, incentivos éticos, ventanas de re-engagement).
- Upsell / cross-sell con IA (bundles, compatibilidad SKU, límites de intrusión UX).
- Páginas de producto generadas por IA (copy + brief de imágenes; cumplimiento legal y marca).
- Checkout optimizado: reducción de fricción (guest, autofill, errores claros, métodos de pago).
- Personalización por comportamiento en tiempo real (segmentos, reglas, privacidad y consentimiento).
- Reviews automáticas (solicitud post-compra, moderación, anti-fraude básico).
- Programa de fidelización automático (puntos, tiers, comunicación).
- Precios dinámicos por demanda (guardrails, transparencia, límites regulatorios placeholder).`;

export function buildEcommerceConvPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: EcommerceConvInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${ECOMMERCE_CONV_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Tienda / marca: ${params.input.businessName}
- Stack / canales: ${services}
- Segmentos / mercados: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runEcommerceConvAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: EcommerceConvInput,
): Promise<EcommerceConvOutput> {
  const prompt = buildEcommerceConvPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, ecommerceConvLlmOpts);
  const parsed = parseEcommerceConvLlmJson(raw, agentId);
  const out: EcommerceConvOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "ecommerceconv", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultEcommerceConvLlm(): ILlmClient {
  return LlmClient.getInstance();
}
