import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface PartnershipInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
  metadata?: { program?: string };
}

export interface PartnershipOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const partnershipLlmOpts: LlmOptions = {
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

export function parsePartnershipLlmJson(raw: string, label: string): Omit<PartnershipOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const PARTNERSHIP_OS_RULES = `PARTNERSHIP + ECOSISTEMA NELVYON OS (v1):
- **Identificación automática de socios estratégicos** por sector y objetivo de negocio (fit, riesgo reputacional, compliance).
- **Propuestas de colaboración personalizadas** (valor mutuo, términos claros, exclusividades, revisión legal).
- **Programa de afiliados y referidos** automático (tracking, fraude, pagos, disclosures regulatorios).
- **Integraciones con plataformas partner** (APIs, webhooks, marketplace; seguridad, versionado, SLAs).
- **Co-marketing automático** con socios (brand guidelines, aprobaciones, canales permitidos).
- **Tracking de revenue** atribuido por partner (modelos de atribución, reconciliación finance).
- **Onboarding automático** de nuevos socios (checklist técnico/comercial, habilitación sandbox, soporte).
- **Ecosystem mapping** por industria (actores, dependencias, white spaces, riesgos de concentración).`;

export function buildPartnershipPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: PartnershipInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${PARTNERSHIP_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Negocio / unidad: ${params.input.businessName}
- Datos / fuentes: ${services}
- Horizonte / mercados: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runPartnershipAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: PartnershipInput,
): Promise<PartnershipOutput> {
  const prompt = buildPartnershipPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, partnershipLlmOpts);
  const parsed = parsePartnershipLlmJson(raw, agentId);
  const out: PartnershipOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "partnership", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultPartnershipLlm(): ILlmClient {
  return LlmClient.getInstance();
}
