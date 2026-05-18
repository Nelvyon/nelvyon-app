import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface SocialvideoInput {
  userId: string;
  businessContext: string;
  agentId: string;
}

export interface SocialvideoOutput {
  result: string;
  insights: string[];
  recommendedActions: string[];
}

export const socialvideoLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.6,
  maxTokens: 1500,
};

const SOCIALVIDEO_OS_RULES = `Eres el agente de **video marketing**, **reels** y **contenido social IA** de NELVYON OS.
- Produces estrategias completas de contenido en video para **TikTok**, **Instagram Reels**, **YouTube Shorts**, **LinkedIn Video** y **YouTube largo**.
- Generas **guiones virales**, planificas **calendarios de contenido**, optimizas **hooks de los primeros 3 segundos**, diseñas estrategias de **subtítulos y accesibilidad**, analizas **tendencias de sonido y hashtags**, produces **briefs de producción detallados** y mides **performance de video**.
- Calidad **producción profesional**, **sin equipo creativo**.`;

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

export function parseSocialvideoLlmJson(raw: string, label: string): SocialvideoOutput {
  const p = parseJson<{ result?: unknown; insights?: unknown; recommendedActions?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  return {
    result,
    insights: parseStringArray(p.insights),
    recommendedActions: parseStringArray(p.recommendedActions),
  };
}

export function buildSocialvideoPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: SocialvideoInput;
}): string {
  const ctx = params.input.businessContext.trim() || "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${SOCIALVIDEO_OS_RULES}

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

function getSocialvideoAgentPromptBlock(agentId: string): AgentPromptBlock {
  switch (agentId) {
    case "socialvideo-estrategia":
      return {
        eliteRole: "Eres **Socialvideo Estrategia** — arquitectura de video por plataforma.",
        mission:
          "**Diseña** estrategia de video por plataforma (objetivos, formatos, frecuencia, tono de marca, KPIs y riesgos).",
        fewShotExample:
          '{"result":"Matriz 5 plataformas × objetivo × formato","insights":["Shorts y Reels compiten por atención: diferenciar hook","YouTube largo para profundidad y SEO"],"recommendedActions":["Piloto 30d por canal","Documento single source of truth"]}',
      };
    case "socialvideo-guiones":
      return {
        eliteRole: "Eres **Socialvideo Guiones** — narrativa y retención.",
        mission:
          "**Genera** guiones virales con hooks potentes (beat sheet 0-3s, cuerpo, CTA, variantes A/B de apertura).",
        fewShotExample:
          '{"result":"Guion 45s + 3 hooks alternativos","insights":["Patrón loop abierto en segundo 1","CTA nativo al gesto de la plataforma"],"recommendedActions":["Tabla lectura en voz alta","Shot list mínima"]}',
      };
    case "socialvideo-calendario":
      return {
        eliteRole: "Eres **Socialvideo Calendario** — cadencia y campañas.",
        mission:
          "**Planifica** calendario de contenido en video (pilares, estacionalidad, repurposing, picos de tendencia).",
        fewShotExample:
          '{"result":"Calendario 4 semanas con 12 slots","insights":["Batch film day reduce coste marginal","Repurpose 1 largo → 3 shorts"],"recommendedActions":["Buffer de evergreen","Slots fijos para trends"]}',
      };
    case "socialvideo-tendencias":
      return {
        eliteRole: "Eres **Socialvideo Tendencias** — cultura y descubrimiento.",
        mission:
          "**Analiza** tendencias, sonidos y hashtags virales (relevancia marca, caducidad, riesgo reputacional).",
        fewShotExample:
          '{"result":"Radar 8 trends + mapa sonido seguro","insights":["Trend genérico sin twist de marca = bajo recall","Hashtags mixtos niche+broad"],"recommendedActions":["Protocolo aprobación legal","Tracker semanal"]}',
      };
    case "socialvideo-produccion":
      return {
        eliteRole: "Eres **Socialvideo Producción** — brief técnico y creativo.",
        mission:
          "**Genera** briefs de producción detallados (luz, plano, audio, B-roll, export specs por plataforma).",
        fewShotExample:
          '{"result":"Brief 1 página + checklist equipo mínimo","insights":["9:16 seguro + safe zones UI","Audio limpio > LUT excesivo"],"recommendedActions":["LUT/música licencias","Naming archivos por campaña"]}',
      };
    case "socialvideo-subtitulos":
      return {
        eliteRole: "Eres **Socialvideo Subtítulos** — accesibilidad y retención silent.",
        mission:
          "**Diseña** estrategia de subtítulos y accesibilidad (burn-in vs SRT, contraste, lectura, WCAG orientativo).",
        fewShotExample:
          '{"result":"Guía estilo subtítulos + 2 plantillas","insights":["Palabras clave resaltadas suben retención","Evitar bloques >2 líneas en móvil"],"recommendedActions":["Transcripción automática + QA humano","Descripciones alternativas clave"]}',
      };
    case "socialvideo-distribucion":
      return {
        eliteRole: "Eres **Socialvideo Distribución** — multi-plataforma sin fricción.",
        mission:
          "**Optimiza** distribución multi-plataforma (recortes, copy nativo, horarios, enlaces, UTM, repurposing).",
        fewShotExample:
          '{"result":"Pack distribución 3 piezas × 4 redes","insights":["Primer comentario con CTA en IG","Shorts: título y capítulo visible"],"recommendedActions":["Matriz aspect ratio","Programación con zona horaria"]}',
      };
    case "socialvideo-analytics":
      return {
        eliteRole: "Eres **Socialvideo Analytics** — medición accionable.",
        mission:
          "**Analiza** performance y métricas de video (retención, swipe-away, saves, shares, atribución cualitativa).",
        fewShotExample:
          '{"result":"Dashboard 8 KPIs + umbrales alerta","insights":["Hook score correlaciona con avg view duration","Saves indican valor percibido"],"recommendedActions":["Post-mortem semanal top/bottom","Experimentos controlados por hook"]}',
      };
    default:
      throw new Error(`${agentId}: agente no soportado`);
  }
}

export async function runSocialvideoAgentCore(
  agentId: string,
  input: SocialvideoInput,
  llm: ILlmClient,
): Promise<SocialvideoOutput> {
  const block = getSocialvideoAgentPromptBlock(agentId);
  const prompt = buildSocialvideoPrompt({
    eliteRole: block.eliteRole,
    mission: block.mission,
    fewShotExample: block.fewShotExample,
    input: { ...input, agentId },
  });
  const raw = await llm.complete(prompt, socialvideoLlmOpts);
  const out = parseSocialvideoLlmJson(raw, agentId);
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "socialvideo", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultSocialvideoLlm(): ILlmClient {
  return LlmClient.getInstance();
}
