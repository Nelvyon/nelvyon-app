import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface GamingInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface GamingOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const gamingLlmOpts: LlmOptions = {
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

export function parseGamingLlmJson(raw: string, label: string): Omit<GamingOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildGamingPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: GamingInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

GAMING NELVYON OS (v1):
- Sector videojuegos: estudios indie y AA, publishers y porting, juegos móvil F2P/premium, PC y consola, creadores de contenido y streamers, agencias de game marketing y UA, comunidades en stores y foros.
- Lanzamiento y wishlists, comunidad en Discord/Reddit/Steam, pricing del juego, DLCs, battle pass y monetización ética, SEO y visibilidad en stores, social en TikTok/YouTube/Twitch y clips, email de early access y retención, reviews y press kit, analytics de DAU, retención, ARPU y LTV.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Estudio / juego: ${params.input.businessName}
- Servicios / plataformas: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runGamingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: GamingInput,
): Promise<GamingOutput> {
  const prompt = buildGamingPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, gamingLlmOpts);
  const parsed = parseGamingLlmJson(raw, agentId);
  const out: GamingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "gaming", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultGamingLlm(): ILlmClient {
  return LlmClient.getInstance();
}
