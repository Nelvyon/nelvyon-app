import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface ComplianceInput {
  userId: string;
  sector: string;
  framework: string;
  currentControls?: string[];
  dataTypes?: string[];
  region?: string;
}

export interface ComplianceOutput {
  agentId: string;
  content: string;
  score: number;
  controls: string[];
  gaps: string[];
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

export function llmOpts(agentId: string): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2500,
    temperature: 0.1,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseComplianceLlmJson(raw: string, label: string): Omit<ComplianceOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; controls?: unknown; gaps?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const c = p.controls;
  const controls = Array.isArray(c)
    ? c.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const g = p.gaps;
  const gaps = Array.isArray(g) ? g.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean) : [];
  return { content, score, controls, gaps };
}

function formatStringList(label: string, items: string[] | undefined): string {
  if (!items || items.length === 0) return `${label}: no indicado`;
  return `${label}: ${items.join(" | ")}`;
}

export function buildComplyPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: ComplianceInput;
}): string {
  const region = params.input.region?.trim() ? params.input.region.trim() : "no indicado";
  const current = formatStringList("Controles actuales (brief)", params.input.currentControls);
  const data = formatStringList("Tipos de datos tratados", params.input.dataTypes);

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK COMPLY (top 1% readiness SOC 2 / ISO 27001 orientativo):
- **Controls**: controles diseñados o ya implementados, trazables al framework citado.
- **Obligations**: obligaciones regulatorias/contractuales relevantes al brief (sin inventar leyes).
- **Map**: correspondencia clara entre requisito ↔ evidencia ↔ propietario sugerido.
- **Protect**: salvaguardas técnicas y organizativas proporcionales al riesgo.
- **Log**: registro, retención y trazabilidad para auditoría (orientativo).
- **Yield**: resultado útil para auditor y dirección (priorización honesta).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Framework / alcance declarado: ${params.input.framework}
- Región / mercados relevantes: ${region}
- ${current}
- ${data}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"controls":["controles implementados o recomendados"],"gaps":["lagunas vs framework declarado"]}`;
}

export async function runComplianceAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: ComplianceInput,
): Promise<ComplianceOutput> {
  const prompt = buildComplyPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId));
  const parsed = parseComplianceLlmJson(raw, agentId);
  const out: ComplianceOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultComplianceLlm(): ILlmClient {
  return LlmClient.getInstance();
}
