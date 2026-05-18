import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";
import { ELITE_V300_STANDARDS, resolveSpecialtyElitePrompt } from "../../prompts/elitePromptLibrary";

export interface EmailMarketingInput {
  userId: string;
  sector: string;
  brand: string;
  targetAudience: string;
  campaignGoal: string;
  productOrService?: string;
  tone?: string;
}

export interface EmailMarketingOutput {
  agentId: string;
  content: string;
  score: number;
  subjectLines: string[];
  previewTexts: string[];
}

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

export function llmOpts(agentId: string, temperature = 0.5): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2500,
    temperature,
  };
}

/** Copy/creative → 0.5; analysis/deliverability → 0.2 */
export function emailMarketingTemperature(agentId: string): number {
  return agentId.toLowerCase().includes("deliverability") ? 0.2 : 0.5;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseEmailMarketingLlmJson(raw: string, label: string): Omit<EmailMarketingOutput, "agentId"> {
  const p = parseJson<{
    content?: unknown;
    score?: unknown;
    subjectLines?: unknown;
    previewTexts?: unknown;
  }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const sl = p.subjectLines;
  const subjectLines = Array.isArray(sl)
    ? sl.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const pt = p.previewTexts;
  const previewTexts = Array.isArray(pt)
    ? pt.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, subjectLines, previewTexts };
}

export function buildInboxPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: EmailMarketingInput;
}): string {
  const prod = params.input.productOrService?.trim()
    ? params.input.productOrService.trim()
    : "no especificado (inferir del sector sin inventar SKU)";
  const tone = params.input.tone?.trim() ? params.input.tone.trim() : "profesional-cercano";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK INBOX (top 1%):
- **Intent**: objetivo de negocio del envío y restricciones (frecuencia, compliance CAN-SPAM/GDPR implícito).
- **Narrative**: arco del mensaje o secuencia (gancho, desarrollo, CTA).
- **Benefit**: beneficio claro para el suscriptor, no solo características.
- **Open**: líneas de asunto y preheader diseñados para curiosidad honesta y relevancia.
- **eXecute**: métricas a vigilar (open, click, reply), sin prometer tasas irreales.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Marca: ${params.input.brand}
- Audiencia: ${params.input.targetAudience}
- Objetivo campaña: ${params.input.campaignGoal}
- Producto/servicio: ${prod}
- Tono: ${tone}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown).
Incluye subjectLines y previewTexts acordes al tipo de agente (puede ser un solo preview si aplica).
{"content":"cuerpo principal o secuencia detallada en español salvo brief","score":0-100,"subjectLines":["..."],"previewTexts":["..."]}`;
}

export async function runEmailMarketingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: EmailMarketingInput,
): Promise<EmailMarketingOutput> {
  const eliteRole = resolveSpecialtyElitePrompt(
    agentId,
    {
      sector: input.sector,
      brand: input.brand,
      targetAudience: input.targetAudience,
      campaignGoal: input.campaignGoal,
      businessContext: input.productOrService,
    },
    params.eliteRole,
  );
  const prompt = buildInboxPrompt({
    eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, emailMarketingTemperature(agentId)));
  const parsed = parseEmailMarketingLlmJson(raw, agentId);
  const out: EmailMarketingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultEmailMarketingLlm(): ILlmClient {
  return LlmClient.getInstance();
}
