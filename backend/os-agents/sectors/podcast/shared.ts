import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface PodcastInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface PodcastOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const podcastLlmOpts: LlmOptions = {
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

export function parsePodcastLlmJson(raw: string, label: string): Omit<PodcastOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const PODCAST_OS_RULES = `PODCAST + AUDIO MARKETING NELVYON OS (v1):
- Episodios desde brief: premisa, duración objetivo, invitados ficticios/placeholder, tono y compliance genérico.
- Guión estructurado: intro gancho, bloques con timestamps sugeridos, transiciones, outro y CTAs.
- Voz IA ElevenLabs multi-speaker (casting, alternancia hablantes, SSML, loudness podcast ~-16 LUFS orientativo).
- Música de fondo Suno v4 (stems, ducking bajo voz, loops y fade).
- Edición y mezcla automática: noise gate ligero, EQ voz, compresión multibanda suave, export WAV/MP3.
- Transcripción Whisper + show notes SEO (H2, bullets, timestamps enlazados, keywords naturales).
- Distribución Spotify / Apple Podcasts / iVoox (RSS fields, categorías, artwork specs, episodio draft).
- Audiogramas redes: clip 60s, waveform visual, safe text 9:16, caption burn-in opcional.
- Análisis de audiencia y optimización de títulos/descripciones (A/B ideas, retention hooks).`;

export function buildPodcastPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PodcastInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${PODCAST_OS_RULES}

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

export async function runPodcastAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: PodcastInput,
): Promise<PodcastOutput> {
  const prompt = buildPodcastPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, podcastLlmOpts);
  const parsed = parsePodcastLlmJson(raw, agentId);
  const out: PodcastOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "podcast", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPodcastLlm(): ILlmClient {
  return LlmClient.getInstance();
}
