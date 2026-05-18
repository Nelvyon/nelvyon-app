import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { ELITE_V300_STANDARDS, resolveSpecialtyElitePrompt } from "../../prompts/elitePromptLibrary";

export interface CopywritingInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface CopywritingOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const copywritingLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.6,
  maxTokens: 2000,
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

export function parseCopywritingLlmJson(raw: string, label: string): Omit<CopywritingOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const COPYWRITING_ELITE_OS_RULES = `COPYWRITING ELITE NELVYON OS (v1):
- Copy de ventas de alta conversión (AIDA, PAS, BAB) con pruebas y variantes.
- Headlines magnéticos A/B testados (promesas claras, curiosidad ética, alineación marca).
- Emails de venta y secuencias completas (cadencia, objeciones, reenganche).
- Landing pages: copy completo (hero, prueba social, FAQ, garantías, sticky CTA).
- Anuncios Google / Meta / TikTok (límites caracteres, extensiones, UTM coherencia).
- Guiones vídeo y reels (hooks 3s, beats, supers, CTA final).
- Descripciones producto SEO optimizadas (H1–H3, bullets, schema-friendly).
- Copy adaptado por sector, audiencia y tono de marca (voice guide, tabúes legales).
- Storytelling de marca (arco, conflicto, prueba, humanización sin claims médicos).
- CTAs optimizados por contexto (primario/secundario, microcopy errores).`;

export function buildCopywritingPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: CopywritingInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${COPYWRITING_ELITE_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Marca / oferta: ${params.input.businessName}
- Canales / formatos: ${services}
- Audiencia / mercados: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runCopywritingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: CopywritingInput,
): Promise<CopywritingOutput> {
  const eliteRole = resolveSpecialtyElitePrompt(
    agentId,
    {
      businessName: input.businessName,
      businessContext: input.services.join(", "),
      targetAudience: input.targets.join(", "),
    },
    params.eliteRole,
  );
  const prompt = buildCopywritingPrompt({
    eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, copywritingLlmOpts);
  const parsed = parseCopywritingLlmJson(raw, agentId);
  const out: CopywritingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "copywriting", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultCopywritingLlm(): ILlmClient {
  return LlmClient.getInstance();
}
