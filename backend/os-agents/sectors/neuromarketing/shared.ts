import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface NeuromarketingInput {
  userId: string;
  businessContext: string;
  agentId: string;
}

export interface NeuromarketingOutput {
  result: string;
  insights: string[];
  recommendedActions: string[];
}

export const neuromarketingLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.5,
  maxTokens: 1500,
};

const NEUROMARKETING_OS_RULES = `Eres el agente de **neuromarketing** e **IA conductual** de NELVYON OS.
- Aplicas principios de neurociencia y psicología del comportamiento para optimizar mensajes, creatividades, flujos de conversión y experiencias de usuario.
- Analizas sesgos cognitivos (urgencia, escasez, prueba social, reciprocidad, anclaje).
- Diseñas copy persuasivo basado en evidencia, optimizas pricing psicológico, creas experiencias de alta fricción reducida y mides impacto emocional de creatividades.
- Calidad enterprise, **resultados medibles**.`;

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

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

export function parseNeuromarketingLlmJson(raw: string, label: string): NeuromarketingOutput {
  const p = parseJson<{ result?: unknown; insights?: unknown; recommendedActions?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  return {
    result,
    insights: parseStringArray(p.insights),
    recommendedActions: parseStringArray(p.recommendedActions),
  };
}

export function buildNeuromarketingPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: NeuromarketingInput;
}): string {
  const ctx = params.input.businessContext.trim() || "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${NEUROMARKETING_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### CONTEXTO DE NEGOCIO
${ctx}

MISIÓN DEL AGENTE (${params.input.agentId}):
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español","insights":["bullets insight"],"recommendedActions":["acciones concretas"]}`;
}

type AgentPromptBlock = { eliteRole: string; mission: string; fewShotExample: string };

function getNeuromarketingAgentPromptBlock(agentId: string): AgentPromptBlock {
  switch (agentId) {
    case "neuromarketing-sesgos":
      return {
        eliteRole: "Eres **Neuromarketing Sesgos** — principios cognitivos aplicados con ética y medición.",
        mission:
          "**Identifica y aplica** sesgos cognitivos clave (urgencia, escasez, prueba social, reciprocidad, anclaje) alineados al contexto y con límites de transparencia.",
        fewShotExample:
          '{"result":"Mapa 5 sesgos + dónde aplicar en funnel","insights":["Anclaje antes del precio final","Escasez real > artificial"],"recommendedActions":["Disclaimer honesto","Métrica uplift por sesgo"]}',
      };
    case "neuromarketing-copy":
      return {
        eliteRole: "Eres **Neuromarketing Copy** — mensajes basados en neurociencia aplicada.",
        mission:
          "**Genera** copy persuasivo basado en neurociencia (headlines, CTAs, microcopy, emails) con variantes y rationale conductual.",
        fewShotExample:
          '{"result":"Pack 6 headlines + 3 CTAs + microcopy checkout","insights":["Verbos de acción + beneficio concreto","Reducir opciones en decisión fatigada"],"recommendedActions":["Test A/B copy corto vs largo","Léxico coherente con marca"]}',
      };
    case "neuromarketing-pricing":
      return {
        eliteRole: "Eres **Neuromarketing Pricing** — precios y percepción de valor.",
        mission:
          "**Optimiza** pricing psicológico y anclajes (tramos, bundles, comparativas, decoy, redondeo percibido) sin engaño al consumidor.",
        fewShotExample:
          '{"result":"Estrategia anclaje + 3 tiers + decoy opcional","insights":["Precio medio como ancla suave","Terminar en 9 en impulso B2C"],"recommendedActions":["Tabla elasticidad proxy","Revisión legal claims"]}',
      };
    case "neuromarketing-ux":
      return {
        eliteRole: "Eres **Neuromarketing UX** — carga cognitiva y flujos.",
        mission:
          "**Diseña** flujos UX de baja fricción cognitiva (pasos, defaults, progreso, recuperación de errores, confianza).",
        fewShotExample:
          '{"result":"Flujo checkout 4 pasos + heurísticas","insights":["Un objetivo por pantalla","Progreso visible reduce abandono"],"recommendedActions":["Audit cognitivo heurístico","Medir tiempo a tarea"]}',
      };
    case "neuromarketing-emociones":
      return {
        eliteRole: "Eres **Neuromarketing Emociones** — impacto emocional de creatividades.",
        mission:
          "**Analiza** impacto emocional de creatividades (tono, color, ritmo, música sugerida, arquetipos) y cómo se conecta con la decisión.",
        fewShotExample:
          '{"result":"Informe emocional 3 creatividades + riesgos","insights":["Contraste alto capta atención inicial","Calma post-hook para confianza"],"recommendedActions":["Matriz tono × etapa funnel","Guidelines asset"]}',
      };
    case "neuromarketing-conversion":
      return {
        eliteRole: "Eres **Neuromarketing Conversión** — funnels y triggers conductuales.",
        mission:
          "**Optimiza** funnels con triggers conductuales (micro-compromisos, prueba social contextual, recuperación carrito, urgencia honesta).",
        fewShotExample:
          '{"result":"Secuencia 7 touchpoints post-intención","insights":["Micro-sí antes del form largo","Email 2h post abandono"],"recommendedActions":["Mapa eventos analytics","Supresión fatiga"]}',
      };
    case "neuromarketing-testing":
      return {
        eliteRole: "Eres **Neuromarketing Testing** — experimentación conductual.",
        mission:
          "**Diseña** tests A/B conductuales (hipótesis, métricas primarias/secundarias, tamaño muestral orientativo, guardrails).",
        fewShotExample:
          '{"result":"Plan A/B CTA + hipótesis H1","insights":["Métrica primaria: CTR secundaria: revenue/user"],"recommendedActions":["Bloque random estable","Parar si guardrail empeora"]}',
      };
    case "neuromarketing-personalidad":
      return {
        eliteRole: "Eres **Neuromarketing Personalidad** — psicografía accionable.",
        mission:
          "**Segmenta** por perfiles psicográficos (motivaciones, aversión al riesgo, necesidad de prueba social) y traduce a mensajes y ofertas.",
        fewShotExample:
          '{"result":"4 segmentos psicográficos + mensajes","insights":["Riesgo alto = más prueba social cuantificada"],"recommendedActions":["Encuesta mínima cero-party","Reglas CRM por segmento"]}',
      };
    default:
      throw new Error(`${agentId}: agente no soportado`);
  }
}

export async function runNeuromarketingAgentCore(
  agentId: string,
  input: NeuromarketingInput,
  llm: ILlmClient,
): Promise<NeuromarketingOutput> {
  const block = getNeuromarketingAgentPromptBlock(agentId);
  const prompt = buildNeuromarketingPrompt({
    eliteRole: block.eliteRole,
    mission: block.mission,
    fewShotExample: block.fewShotExample,
    input: { ...input, agentId },
  });
  const raw = await llm.complete(prompt, neuromarketingLlmOpts);
  const out = parseNeuromarketingLlmJson(raw, agentId);
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "neuromarketing", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultNeuromarketingLlm(): ILlmClient {
  return LlmClient.getInstance();
}
