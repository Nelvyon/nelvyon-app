import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor estratega omnicanal y CRM del mundo.

Auditoría omnicanal de {{CLIENT_NAME}}: email, SMS, push, social, WhatsApp en {{INDUSTRY}}.

Público: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: channelAudit, messageConsistency, frequencyAnalysis, dataReadiness, complianceGaps, quickWins.`;

export const PROMPT_STRATEGY = `Eres el mejor arquitecto de customer journeys omnicanal del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Arquitectura de canales: qué mensaje en qué canal, frecuencia, segmentación para {{TARGET_AUDIENCE}}. Responde SOLO JSON con:
channelRoles, segmentationModel, frequencyCaps, orchestrationPrinciples, consentStrategy, successMetrics.`;

export const PROMPT_EXECUTION = `Eres el mejor director de comunicaciones integradas del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}} | Colores {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}

Plan de comunicaciones 90 días con calendario editorial y plantillas por canal. Responde SOLO JSON con:
calendar90d (semanas con temas), templatesByChannel (email, sms, push, social, whatsapp), creativeGuidelines, ctaLibrary.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor analista de growth y experimentación omnicanal del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Orquestación omnicanal, journey mapping, A/B testing por canal. Responde SOLO JSON con:
journeyMaps, orchestrationRules, abTestBacklog, holdoutDesign, attributionNotes, personalizationEngine.`;

export const PROMPT_QA = `Eres el mejor DPO de marketing y compliance de comunicaciones del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Consistencia de marca, GDPR/LOPD, opt-out flows. Responde SOLO JSON con:
brandConsistencyCheck, gdprLopdChecklist, optOutFlows, recordKeeping, vendorDpa, blockers.`;

export const PROMPT_REPORT = `Eres el CMO de la mejor agencia de CRM del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: engagement esperado por canal y ROI de comunicaciones para {{CLIENT_NAME}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla por canal. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteComunicacionesIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptComunicacionesAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptComunicacionesStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptComunicacionesExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptComunicacionesOptimization(
  step1: string,
  step2: string,
  step3: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(
    PROMPT_OPTIMIZATION,
    merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2, STEP3_RESULT: step3 }),
  );
}

export function promptComunicacionesQa(
  step1: string,
  step2: string,
  step3: string,
  step4: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(
    PROMPT_QA,
    merge(eliteLote2CommonVars(payload), {
      STEP1_RESULT: step1,
      STEP2_RESULT: step2,
      STEP3_RESULT: step3,
      STEP4_RESULT: step4,
    }),
  );
}

export function promptComunicacionesReport(
  payload: OsJobPayload,
  s1: string,
  s2: string,
  s3Summary: string,
  s4Summary: string,
  s5: string,
): string {
  return buildPrompt(
    PROMPT_REPORT,
    merge(eliteLote2CommonVars(payload), {
      STEP1_RESULT: s1,
      STEP2_RESULT: s2,
      STEP3_SUMMARY: s3Summary,
      STEP4_SUMMARY: s4Summary,
      STEP5_RESULT: s5,
    }),
  );
}
