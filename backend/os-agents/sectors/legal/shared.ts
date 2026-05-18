import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface LegalInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface LegalOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const legalLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.2,
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

export function parseLegalLlmJson(raw: string, label: string): Omit<LegalOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const LEGAL_OS_RULES = `LEGAL COMPLIANCE OS (v1) — ámbito mundial:
- Generación asistida de documentos legales tipo: TOS, Política de Privacidad, Cookies, GDPR, CCPA, LGPD, PIPEDA (plantillas informativas; no sustituye abogado).
- Adaptación por país/jurisdicción (referencia a ~195 soberanías con disclaimers de verificación local).
- Cláusulas de limitación de responsabilidad estilo proveedor modelo (cloud/LLM): sin garantía absoluta, uso bajo propio riesgo, revisión profesional recomendada.
- Contratos de servicio post-cierre, NDAs, SLA: estructuras estándar con placeholders y checklist de negociación.
- Actualización ante cambios legales: proceso de revisión periódica, registro de versiones, diff sugerido.
- Firma digital: requisitos de integridad, trazabilidad, identidad y conservación (marco genérico).`;

export function buildLegalPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: LegalInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${LEGAL_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Organización / producto: ${params.input.businessName}
- Servicios / canales: ${services}
- Segmentos / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runLegalAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: LegalInput,
): Promise<LegalOutput> {
  const prompt = buildLegalPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, legalLlmOpts);
  const parsed = parseLegalLlmJson(raw, agentId);
  const out: LegalOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "legal", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultLegalLlm(): ILlmClient {
  return LlmClient.getInstance();
}
