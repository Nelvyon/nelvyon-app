import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ImagenesInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface ImagenesOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const imagenesLlmOpts: LlmOptions = {
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

export function parseImagenesLlmJson(raw: string, label: string): Omit<ImagenesOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const IMAGENES_OS_RULES = `GENERADOR IMÁGENES + CREATIVIDADES NELVYON OS (v1):
- Generación de imágenes publicitarias con **Flux Pro Ultra** (máxima calidad, negativos, seed, revisión humana claims).
- Banners y creatividades para **Instagram, Facebook, Google, TikTok, LinkedIn, Pinterest** (safe zones, texto en imagen mínimo).
- **Texto separado de imagen** para máxima nitidez (layers: headline/CTA aparte, export doble).
- **Foto de producto con fondo IA** (recorte, sombras coherentes, color fidelity, PSD lógico).
- **Avatares y personajes de marca** (consistencia facial, derechos de imagen, diversidad responsable).
- **Variaciones automáticas A/B** de creatividades (matriz de pruebas, hipótesis, parada por fatiga).
- **Adaptación automática de formatos y tamaños** por plataforma (1:1, 4:5, 9:16, Discovery, Pin vertical).
- **Estilos visuales consistentes** por marca (brand kit visual: paleta, tipografía, textura, línea iconográfica).`;

export function buildImagenesPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ImagenesInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${IMAGENES_OS_RULES}

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

export async function runImagenesAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ImagenesInput,
): Promise<ImagenesOutput> {
  const prompt = buildImagenesPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, imagenesLlmOpts);
  const parsed = parseImagenesLlmJson(raw, agentId);
  const out: ImagenesOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "imagenes", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultImagenesLlm(): ILlmClient {
  return LlmClient.getInstance();
}
