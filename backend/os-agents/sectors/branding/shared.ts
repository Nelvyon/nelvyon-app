import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface BrandingInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface BrandingOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const brandingLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.6,
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

export function parseBrandingLlmJson(raw: string, label: string): Omit<BrandingOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const BRANDING_COMPLETO_IA_RULES = `BRANDING COMPLETO IA NELVYON OS (v1):
- Identidad de marca completa: nombre, tagline, valores, personalidad y tono de voz documentado.
- Logo concept + paleta de colores IA (dirección creativa, no entrega legal de marca registrada).
- Guía de marca / brandbook (uso logo, espaciado, tipografía sugerida, fotografía, prohibidos).
- Naming de productos y servicios (disponibilidad dominio placeholder, criterios memorabilidad).
- Posicionamiento competitivo (mapa perceptual, diferenciación, prueba de mensaje).
- Arquitectura de marca (submarcas, endorsed, house of brands según brief).
- Brand voice consistente en todos los canales (matriz tono por contexto: social, sales, support).
- Rebranding estratégico (razones, riesgos, rollout, coexistencia legacy).
- Brand audit automático (coherencia visual/verbal, checklist, priorización quick wins).`;

export function buildBrandingPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: BrandingInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${BRANDING_COMPLETO_IA_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Marca / proyecto: ${params.input.businessName}
- Contexto / industria: ${services}
- Audiencia / mercados: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runBrandingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: BrandingInput,
): Promise<BrandingOutput> {
  const prompt = buildBrandingPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, brandingLlmOpts);
  const parsed = parseBrandingLlmJson(raw, agentId);
  const out: BrandingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "branding", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultBrandingLlm(): ILlmClient {
  return LlmClient.getInstance();
}
