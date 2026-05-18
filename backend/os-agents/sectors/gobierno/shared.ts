import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface GobiernoInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface GobiernoOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const gobiernoLlmOpts: LlmOptions = {
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

export function parseGobiernoLlmJson(raw: string, label: string): Omit<GobiernoOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildGobiernoPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: GobiernoInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

GOBIERNO / SECTOR PÚBLICO NELVYON OS (v1):
- Sector gobierno y entidades de interés público: ayuntamientos y diputaciones, administraciones autonómicas y estatales, ONGs y fundaciones, entidades públicas empresariales y consorcios, organizaciones sin ánimo de lucro con misión social.
- Comunicación institucional y transparencia, participación ciudadana digital, contenido informativo y divulgación, SEO institucional, redes sociales corporativas, comunicaciones masivas a ciudadanía, reputación y percepción, analytics de alcance y engagement (neutralidad partidista, accesibilidad y protección de datos).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Entidad / negocio: ${params.input.businessName}
- Servicios / áreas: ${services}
- Objetivos / públicos: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runGobiernoAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: GobiernoInput,
): Promise<GobiernoOutput> {
  const prompt = buildGobiernoPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, gobiernoLlmOpts);
  const parsed = parseGobiernoLlmJson(raw, agentId);
  const out: GobiernoOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "gobierno", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultGobiernoLlm(): ILlmClient {
  return LlmClient.getInstance();
}
