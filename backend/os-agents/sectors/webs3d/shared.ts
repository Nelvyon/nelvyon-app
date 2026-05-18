import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface Webs3dInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface Webs3dOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const webs3dLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 1200,
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

export function parseWebs3dLlmJson(raw: string, label: string): Omit<Webs3dOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildWebs3dPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: Webs3dInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

WEBS 3D / EXPERIENCIAS INMERSIVAS NELVYON OS (v1):
- Sector interactivo 3D: estudios WebGL y Three.js, experiencias inmersivas en navegador, metaverso y salas virtuales, realidad aumentada web (WebXR), visualización 3D de producto y configuradores, tours espaciales y digital twins ligeros.
- Portfolio de experiencias 3D y demos interactivos, captación de marcas y agencias, pricing de proyectos WebGL y AR/VR, SEO para experiencias web y visualización 3D, showcase en X, LinkedIn y YouTube, email outreach premium, casos de éxito y prueba social técnica, analytics de engagement, tiempo de sesión y conversión.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Estudio / producto: ${params.input.businessName}
- Stack / servicios: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runWebs3dAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: Webs3dInput,
): Promise<Webs3dOutput> {
  const prompt = buildWebs3dPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, webs3dLlmOpts);
  const parsed = parseWebs3dLlmJson(raw, agentId);
  const out: Webs3dOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "webs3d", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultWebs3dLlm(): ILlmClient {
  return LlmClient.getInstance();
}
