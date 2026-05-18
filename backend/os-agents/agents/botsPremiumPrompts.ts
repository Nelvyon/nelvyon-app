import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor conversacionalista y diseñador de NLU del mundo.

Análisis de conversaciones actuales de {{CLIENT_NAME}} y casos de uso de bots en {{INDUSTRY}}.

Público: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: conversationAudit, topIntentsObserved, painPoints, automationOpportunities, channelFit, risks.`;

export const PROMPT_STRATEGY = `Eres el mejor arquitecto de asistentes virtuales omnicanal del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Arquitectura conversacional: intents, entidades, flujos, escalación a humano; canales web, WhatsApp, Telegram. Responde SOLO JSON con:
intentTaxonomy, entityModel, dialogFlows, handoffRules, channelMatrix, guardrails.`;

export const PROMPT_EXECUTION = `Eres el mejor diseñador de bots enterprise del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}}

Diseño de 3 bots (soporte, ventas, onboarding) con ~50 intents cada uno (resume por categorías + ejemplos). Responde SOLO JSON con:
bots (array de 3: name, purpose, intentsOutline con ~50 agrupados por tema, sampleUtterances, happyPaths), integrations, fallbackPolicy.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor ML ops conversacional del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

NLU training, análisis de fallbacks, personalización dinámica. Responde SOLO JSON con:
trainingDataPlan, fallbackAnalytics, personalizationRules, abTestPlan, continuousImprovement, safetyFilters.`;

export const PROMPT_QA = `Eres el mejor QA de chatbots de misión crítica del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Pruebas de conversación, cobertura de intents, tiempos de respuesta objetivo < 500ms. Responde SOLO JSON con:
testSuites, intentCoverage, latencyBudget, loadTestPlan, regressionPack, blockers.`;

export const PROMPT_REPORT = `Eres el director de CX automation de la mejor consultora del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: reducción de tickets esperada y CSAT proyectado para {{TARGET_AUDIENCE}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla de impacto. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteBotsIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptBotsAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptBotsStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptBotsExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptBotsOptimization(step1: string, step2: string, step3: string, payload: OsJobPayload): string {
  return buildPrompt(
    PROMPT_OPTIMIZATION,
    merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2, STEP3_RESULT: step3 }),
  );
}

export function promptBotsQa(
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

export function promptBotsReport(
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
