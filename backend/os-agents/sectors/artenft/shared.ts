import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ArteNftInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface ArteNftOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const arteNftLlmOpts: LlmOptions = {
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

export function parseArteNftLlmJson(raw: string, label: string): Omit<ArteNftOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildArteNftPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ArteNftInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

ARTE / NFT NELVYON OS (v1):
- Sector arte digital y NFT: artistas digitales, coleccionistas y curadores, galerías online y exposiciones virtuales, creadores NFT y generative art, marketplaces de arte (OpenSea, Foundation, SuperRare, etc.), ilustradores y motion art.
- Portfolio y storytelling visual, comunidad de fans y holders, pricing de obras físicas/digitales y ediciones limitadas, SEO y discoverability en marketplaces, social en Instagram/X/TikTok, email para coleccionistas y drops, reputación y prueba social, analytics de ventas y conversión.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Marca / artista: ${params.input.businessName}
- Servicios / canales: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runArteNftAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ArteNftInput,
): Promise<ArteNftOutput> {
  const prompt = buildArteNftPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, arteNftLlmOpts);
  const parsed = parseArteNftLlmJson(raw, agentId);
  const out: ArteNftOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "artenft", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultArteNftLlm(): ILlmClient {
  return LlmClient.getInstance();
}
