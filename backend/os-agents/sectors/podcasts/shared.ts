import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface PodcastsInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface PodcastsOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const podcastsLlmOpts: LlmOptions = {
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

export function parsePodcastsLlmJson(raw: string, label: string): Omit<PodcastsOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildPodcastsPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PodcastsInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PODCASTS / AUDIO NELVYON OS (v1):
- Sector audio: podcasters independientes y redes de podcasts, productoras de audio y post, músicos independientes y singles, audiolibros y narración, radio online y streaming en vivo.
- Crecimiento de audiencia y suscriptores, monetización con sponsors, membresías y contenido premium, pricing de publicidad y patrocinios, SEO y descubrimiento en Spotify, Apple Podcasts y Google Podcasts, clips y reels para redes, newsletter y comunidad de oyentes, reviews en plataformas y reputación, analytics de descargas, retención y CPM.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Show / marca: ${params.input.businessName}
- Servicios / formatos: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runPodcastsAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: PodcastsInput,
): Promise<PodcastsOutput> {
  const prompt = buildPodcastsPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, podcastsLlmOpts);
  const parsed = parsePodcastsLlmJson(raw, agentId);
  const out: PodcastsOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "podcasts", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPodcastsLlm(): ILlmClient {
  return LlmClient.getInstance();
}
