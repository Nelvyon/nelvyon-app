import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface Web3dInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface Web3dOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const web3dLlmOpts: LlmOptions = {
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

export function parseWeb3dLlmJson(raw: string, label: string): Omit<Web3dOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const WEB3D_OS_RULES = `WEB 3D + INMERSIVAS ELITE NELVYON OS (v1):
- Generación de webs 3D con Three.js / WebGL / Spline (arquitectura de escena, materiales, iluminación, pipeline de build).
- Experiencias inmersivas con scroll-driven animations (timelines, pinning, easing, accesibilidad reducida-motion).
- Configuradores 3D de producto interactivos (estados, variantes, snapshots, UX táctil y teclado).
- Tours virtuales 360° (equirectangular / cubemaps, hotspots, progresión narrativa).
- Partículas y shaders personalizados por marca (GLSL cauteloso, fallbacks, presupuesto GPU).
- Optimización rendimiento: LOD, instancing, frustum culling, lazy loading 3D, compresión mesh/texturas.
- Integración WebXR para VR/AR (session modes, hand input opcional, degradación graceful).
- Exportación de assets GLTF / GLB (PBR, compresión Draco/Meshopt cuando aplique, validación).`;

export function buildWeb3dPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: Web3dInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${WEB3D_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / stack: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runWeb3dAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: Web3dInput,
): Promise<Web3dOutput> {
  const prompt = buildWeb3dPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, web3dLlmOpts);
  const parsed = parseWeb3dLlmJson(raw, agentId);
  const out: Web3dOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "web3d", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultWeb3dLlm(): ILlmClient {
  return LlmClient.getInstance();
}
