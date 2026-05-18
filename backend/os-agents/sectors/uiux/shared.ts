import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface UiuxInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface UiuxOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const uiuxLlmOpts: LlmOptions = {
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

export function parseUiuxLlmJson(raw: string, label: string): Omit<UiuxOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

const UIUX_OS_RULES = `DISEÑO UI/UX GENERATIVO NELVYON OS (v1):
- Sistemas de diseño completos: tokens semánticos, paleta, tipografía escalada, espaciado 4/8pt, elevación y motion tokens.
- Wireframes y prototipos asistidos por IA desde brief de texto (flujos, estados vacíos/error, criterios de aceptación UX).
- Componentes React + Tailwind orientados a producción (composición, variantes, slots, tests visuales sugeridos).
- Auditoría UX automática: mapas de calor conceptuales, análisis de flujo, puntos de fricción y severidad.
- A/B testing de interfaces: hipótesis, métricas primarias/secundarias, tamaño muestral cauteloso, guardrails éticos.
- Accesibilidad WCAG 2.2 AA: contraste, foco, teclado, roles ARIA, textos alternativos, formularios accesibles.
- Dark / light mode: estrategia de tokens duales, imágenes y charts adaptables, preferencias del sistema.
- Export design system: Figma (variables/components) y Storybook (MDX, controls, a11y addon) como entregables.`;

export function buildUiuxPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: UiuxInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${UIUX_OS_RULES}

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

export async function runUiuxAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: UiuxInput,
): Promise<UiuxOutput> {
  const prompt = buildUiuxPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, uiuxLlmOpts);
  const parsed = parseUiuxLlmJson(raw, agentId);
  const out: UiuxOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "uiux", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultUiuxLlm(): ILlmClient {
  return LlmClient.getInstance();
}
