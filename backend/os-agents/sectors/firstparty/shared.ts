import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface FirstPartyInput {
  userId: string;
  businessContext: string;
  agentId: string;
}

export interface FirstPartyOutput {
  result: string;
  insights: string[];
  recommendedActions: string[];
}

export const firstpartyLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.4,
  maxTokens: 1500,
};

const FIRST_PARTY_OS_RULES = `Eres el agente de datos **first-party** y estrategia **cookieless** de NELVYON OS.
- Recopilas datos propios del cliente (CRM, web, email, transacciones) con trazabilidad y minimización.
- Diseñas estrategias de captación cookieless (zero-party data, progressive profiling, consent walls).
- Modelas audiencias propietarias y activas un **CDP ligero** con sincronización de fuentes.
- Generas **segmentos accionables** y aseguras cumplimiento **GDPR/CCPA** total.
- Calidad enterprise, **sin dependencia de terceras partes** para decisiones críticas.`;

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

export function parseFirstPartyLlmJson(raw: string, label: string): FirstPartyOutput {
  const p = parseJson<{ result?: unknown; insights?: unknown; recommendedActions?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  return {
    result,
    insights: parseStringArray(p.insights),
    recommendedActions: parseStringArray(p.recommendedActions),
  };
}

export function buildFirstPartyPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: FirstPartyInput;
}): string {
  const ctx = params.input.businessContext.trim() || "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

${FIRST_PARTY_OS_RULES}

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

function getFirstPartyAgentPromptBlock(agentId: string): AgentPromptBlock {
  switch (agentId) {
    case "firstparty-auditoria":
      return {
        eliteRole: "Eres **First-Party Auditoría** — inventario y calidad de fuentes propias.",
        mission:
          "**Audita** fuentes de datos propios existentes (CRM, web, email, transacciones): cobertura, PII, duplicados, lag y ownership.",
        fewShotExample:
          '{"result":"Informe auditoría 5 fuentes + gaps","insights":["Web sin server-side events","CRM desalineado con pedidos"],"recommendedActions":["Mapa de campos canónico","Job dedupe semanal"]}',
      };
    case "firstparty-captacion":
      return {
        eliteRole: "Eres **First-Party Captación** — zero-party sin fricción abusiva.",
        mission:
          "**Diseña** flujos de captación zero-party data (progressive profiling, preferencias, consent walls, value exchange claro).",
        fewShotExample:
          '{"result":"3 micro-flujos post-login + consent granular","insights":["Solo 2 preguntas por sesión mejora completitud"],"recommendedActions":["A/B copy value exchange","Guardar en perfil unificado"]}',
      };
    case "firstparty-cdp":
      return {
        eliteRole: "Eres **First-Party CDP** — CDP ligero operable.",
        mission:
          "**Activa** CDP ligero + sincronización de fuentes (identidad, resolución, SLAs, observabilidad, rollback).",
        fewShotExample:
          '{"result":"Arquitectura CDP ligero 4 conectores","insights":["ID estable email+user_id reduce colisiones"],"recommendedActions":["Contrato esquema eventos","Monitorización freshness"]}',
      };
    case "firstparty-segmentacion":
      return {
        eliteRole: "Eres **First-Party Segmentación** — segmentos accionables solo con datos propios.",
        mission:
          "**Crea** segmentos accionables desde datos propios (reglas, umbrales, refresco, documentación para marketing).",
        fewShotExample:
          '{"result":"6 segmentos RFM-lite + SQL ejemplo","insights":["Separar intención vs compra reciente"],"recommendedActions":["Versionar definiciones","Revisión legal segmentos sensibles"]}',
      };
    case "firstparty-activacion":
      return {
        eliteRole: "Eres **First-Party Activación** — salida a canales con gobernanza.",
        mission:
          "**Activa** segmentos en canales (email, ads first-party signals, web personalización) con supresión y límites de frecuencia.",
        fewShotExample:
          '{"result":"Playbook activación 3 canales + checklist","insights":["Sync delay 15m reduce errores ads"],"recommendedActions":["Piggyback consent por canal","QA en staging"]}',
      };
    case "firstparty-privacidad":
      return {
        eliteRole: "Eres **First-Party Privacidad** — GDPR/CCPA y consent management.",
        mission:
          "**Asegura** cumplimiento GDPR/CCPA (bases legales, DSR, retención, DPIA ligera, registro de consentimientos).",
        fewShotExample:
          '{"result":"Matriz tratamiento + mapa consent","insights":["Legitimate interest solo con LIA"],"recommendedActions":["Política retención por fuente","Portal DSR"]}',
      };
    case "firstparty-enriquecimiento":
      return {
        eliteRole: "Eres **First-Party Enriquecimiento** — señales comportamentales propias.",
        mission:
          "**Enriquece** perfiles con señales comportamentales (eventos producto, engagement, riesgo de sesgo, límites de inferencia).",
        fewShotExample:
          '{"result":"12 features comportamentales derivados first-party","insights":["Ventanas 30d evitan ruido estacional"],"recommendedActions":["Feature store interno","Documentar origen dato"]}',
      };
    case "firstparty-prediccion":
      return {
        eliteRole: "Eres **First-Party Predicción** — modelos con datos propios únicamente.",
        mission:
          "**Modela** predicciones desde datos propios (churn, conversión, LTV proxy; explicabilidad; revisión humana en decisiones graves).",
        fewShotExample:
          '{"result":"Blueprint modelo churn solo first-party","insights":["Calibração con cohorte holdout"],"recommendedActions":["Fairness review","Monitor drift mensual"]}',
      };
    default:
      throw new Error(`${agentId}: agente no soportado`);
  }
}

export async function runFirstPartyAgentCore(agentId: string, input: FirstPartyInput, llm: ILlmClient): Promise<FirstPartyOutput> {
  const block = getFirstPartyAgentPromptBlock(agentId);
  const prompt = buildFirstPartyPrompt({
    eliteRole: block.eliteRole,
    mission: block.mission,
    fewShotExample: block.fewShotExample,
    input: { ...input, agentId },
  });
  const raw = await llm.complete(prompt, firstpartyLlmOpts);
  const out = parseFirstPartyLlmJson(raw, agentId);
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "firstparty", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultFirstPartyLlm(): ILlmClient {
  return LlmClient.getInstance();
}
