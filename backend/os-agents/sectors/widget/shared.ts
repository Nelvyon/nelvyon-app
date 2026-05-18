import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface WidgetInput {
  userId: string;
  sector: string;
  brand: string;
  metrics: Record<string, string>;
  widgetType?: string;
  embedTarget?: string;
}

export interface WidgetOutput {
  agentId: string;
  content: string;
  score: number;
  embedCode: string;
  previewData: string[];
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

export function llmOpts(agentId: string, temperature: number): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseWidgetLlmJson(raw: string, label: string): Omit<WidgetOutput, "agentId"> {
  const p = parseJson<{
    content?: unknown;
    score?: unknown;
    embedCode?: unknown;
    previewData?: unknown;
  }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const embedCode = typeof p.embedCode === "string" ? p.embedCode : String(p.embedCode ?? "");
  const pd = p.previewData;
  const previewData = Array.isArray(pd)
    ? pd.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, embedCode, previewData };
}

export function buildEmbedPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: WidgetInput;
}): string {
  const metrics =
    params.input.metrics && Object.keys(params.input.metrics).length > 0
      ? JSON.stringify(params.input.metrics, null, 0)
      : "{}";
  const wtype = params.input.widgetType?.trim() ? params.input.widgetType.trim() : "no indicado";
  const target = params.input.embedTarget?.trim() ? params.input.embedTarget.trim() : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

FRAMEWORK EMBED (top 1% widgets embebibles):
- **Engage**: captar atención sin romper la página huésped; rendimiento y accesibilidad.
- **Message**: mensaje claro alineado a métricas reales del brief (sin inflar cifras).
- **Brandize**: colores, tipografía y tono coherentes con la marca indicada.
- **Evidence**: prueba social y datos verificables según lo proporcionado.
- **Drive**: CTA o interacción medible cuando aplique.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Marca: ${params.input.brand}
- Métricas (clave→valor): ${metrics}
- Tipo widget: ${wtype}
- Destino embed: ${target}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"documentación breve en español","score":0-100,"embedCode":"snippet HTML/JS seguro y autocontenido o iframe sugerido","previewData":["líneas de preview o datos mostrados"]}`;
}

export async function runWidgetAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: WidgetInput,
  temperature: number,
): Promise<WidgetOutput> {
  const prompt = buildEmbedPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseWidgetLlmJson(raw, agentId);
  const out: WidgetOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultWidgetLlm(): ILlmClient {
  return LlmClient.getInstance();
}
