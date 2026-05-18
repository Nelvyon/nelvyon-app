import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor estratega de voz de marca y copy del mundo. Has auditado contenidos para Nike, Patagonia y The New York Times.

Auditoría de voz de marca y análisis de competidores {{COMPETITORS}}.

Cliente: {{CLIENT_NAME}}
Sector: {{INDUSTRY}}
Audiencia: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Colores: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}
Referencias: {{REFERENCE_URLS}}

Responde SOLO JSON con: voiceAudit, competitorMessagingCodes, whitespaceTopics, risks, strengths.`;

export const PROMPT_STRATEGY = `Eres el mejor planner editorial del mundo. Referencias: estrategias de HubSpot y Shopify Plus.

Contexto:
{{STEP1_RESULT}}

{{CLIENT_NAME}} | {{INDUSTRY}} | Tono {{TONE}}

Calendario editorial 90 días, pilares de contenido, topic clusters. Responde SOLO JSON con:
pillars, clusters (array con pillar, articles), ninetyDayOutline, formatsMix, governanceNotes.`;

export const PROMPT_EXECUTION = `Eres el mejor redactor multiformato del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

15 piezas de contenido (blog, social, landing). Responde SOLO JSON con:
pieces (array de 15 objetos: type, title, hook, outline, cta).`;

export const PROMPT_OPTIMIZATION = `Eres el mejor SEO on-page del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Sector: {{INDUSTRY}}

SEO on-page por pieza: keywords, density guidance, meta copy. Responde SOLO JSON con:
onPageRules, keywordMap, metaTemplates, internalLinks, snippetOptimization.`;

export const PROMPT_QA = `Eres el mejor editor de calidad de marca del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Tono declarado: {{TONE}}

Coherencia de tono, brand voice, legibilidad. Responde SOLO JSON con:
toneScorecard, readabilityNotes, inconsistencies, approvalChecklist.`;

export const PROMPT_REPORT = `Eres el CEO de la mejor agencia de contenido del mundo. Presentas a {{CLIENT_NAME}}.

Markdown con proyección de tráfico orgánico y engagement esperado, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Contenido (extracto): {{STEP3_SUMMARY}}
- SEO on-page (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Termina con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptCopyAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptCopyStrategy(s1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1 }));
}

export function promptCopyExecution(s1: string, s2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2 }));
}

export function promptCopyOptimization(s1: string, s2: string, s3: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_OPTIMIZATION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_RESULT: s3 }));
}

export function promptCopyQa(s1: string, s2: string, s3: string, s4: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_QA, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_RESULT: s3, STEP4_RESULT: s4 }));
}

export function promptCopyReport(payload: OsJobPayload, s1: string, s2: string, s3s: string, s4s: string, s5: string): string {
  return buildPrompt(PROMPT_REPORT, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_SUMMARY: s3s, STEP4_SUMMARY: s4s, STEP5_RESULT: s5 }));
}
