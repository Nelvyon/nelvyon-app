import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor estratega de email marketing del mundo. Has construido programas para Spotify, Airbnb y Patagonia con deliverability best-in-class.

Auditoría de lista, segmentación y benchmarks del sector {{INDUSTRY}}.

Cliente: {{CLIENT_NAME}}
Público objetivo: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores marca: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: listHealth, segments, competitorEmailBenchmarks, gaps, quickWins, risks.`;

export const PROMPT_STRATEGY = `Eres el mejor arquitecto de automatización de email del mundo. Referencias: Klaviyo enterprise, Iterable, Braze.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}} | Audiencia: {{TARGET_AUDIENCE}}

Secuencias automatizadas: welcome series, nurture, reactivación. Responde SOLO JSON con:
automations (array con name, trigger, goal, stepsOutline), welcomeSeries, nurtureTracks, winbackIdeas, cadenceRules.`;

export const PROMPT_EXECUTION = `Eres el mejor copywriter de email del mundo. Has escrito campañas para Apple y Notion.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}}

Genera 10 emails con asunto, preheader, body, CTA. Responde SOLO JSON con:
emails (array de 10 objetos: subject, preheader, body, cta, segmentHint).`;

export const PROMPT_OPTIMIZATION = `Eres el mejor optimizador de performance de email del mundo. Referencias: Litmus, Email on Acid, Google Postmaster.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

A/B testing de asuntos, horarios de envío, personalización dinámica. Responde SOLO JSON con:
subjectTests, sendTimeHypotheses, dynamicPersonalizationRules, holdoutPlan, successMetrics.`;

export const PROMPT_QA = `Eres el mejor QA de deliverability del mundo. Has certificado programas para bancos y salud (YMYL).

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Colores referencia marca: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}

Revisión deliverability, spam score, mobile rendering. Responde SOLO JSON con:
deliverabilityChecklist, spamRiskFactors, mobileRenderingNotes, dmarcSpfDkim, inboxPlacementPlan, blockers.`;

export const PROMPT_REPORT = `Eres el CEO de la mejor agencia CRM/email del mundo. Presentas resultados a {{CLIENT_NAME}}.

Markdown ejecutivo con métricas esperadas (open rate, CTR, conversiones) para {{TARGET_AUDIENCE}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Emails (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla KPI 90 días. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptEmailAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptEmailStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptEmailExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptEmailOptimization(step1: string, step2: string, step3: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_OPTIMIZATION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2, STEP3_RESULT: step3 }));
}

export function promptEmailQa(step1: string, step2: string, step3: string, step4: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_QA, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2, STEP3_RESULT: step3, STEP4_RESULT: step4 }));
}

export function promptEmailReport(
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
