import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor director de fotografía de producto del mundo. Has definido estética para Apple y Dyson.

Benchmarks fotográficos en {{INDUSTRY}} y análisis de competidores {{COMPETITORS}}.

Cliente: {{CLIENT_NAME}}
Audiencia: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Colores marca: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}
Referencias: {{REFERENCE_URLS}}

Responde SOLO JSON con: visualCodes, competitorPhotoAudit, gaps, moodDirections, risks.`;

export const PROMPT_STRATEGY = `Eres el mejor still-life creative director del mundo.

Contexto:
{{STEP1_RESULT}}

{{CLIENT_NAME}} | {{INDUSTRY}}

Plan fotográfico: hero, lifestyle, detalle, pack shots. Responde SOLO JSON con:
shotList, anglesPerSku, lightingMood, setDesign, propsPolicy, deliverablesList.`;

export const PROMPT_EXECUTION = `Eres el mejor fotógrafo de estudio del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono {{TONE}}

Brief fotográfico completo: iluminación, backgrounds, props, retoque. Responde SOLO JSON con:
lightingSetup, backgrounds, props, retouchingPipeline, fileNaming, colorProfile.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor optimizador de assets ecommerce del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Competidores: {{COMPETITORS}}

WebP, lazy load, responsive images, alt text SEO. Responde SOLO JSON con: responsiveBreakpoints, lazyLoadRules, altTextFormula, compressionTargets.`;

export const PROMPT_QA = `Eres el mejor control de calidad de imagen del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Color primario referencia: {{PRIMARY_COLOR}}

Checklist: consistencia de color, sombras, fondos. Responde SOLO JSON con: colorCheck, shadowRules, backgroundConsistency, rejectionCriteria.`;

export const PROMPT_REPORT = `Eres el CEO del mejor estudio de producto del mundo. Presentas a {{CLIENT_NAME}}.

Markdown con impacto esperado en CTR (+25% típico) y tiempo en página:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Brief (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Termina con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptPhotoAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptPhotoStrategy(s1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1 }));
}

export function promptPhotoExecution(s1: string, s2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2 }));
}

export function promptPhotoOptimization(s1: string, s2: string, s3: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_OPTIMIZATION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_RESULT: s3 }));
}

export function promptPhotoQa(s1: string, s2: string, s3: string, s4: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_QA, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_RESULT: s3, STEP4_RESULT: s4 }));
}

export function promptPhotoReport(payload: OsJobPayload, s1: string, s2: string, s3s: string, s4s: string, s5: string): string {
  return buildPrompt(PROMPT_REPORT, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_SUMMARY: s3s, STEP4_SUMMARY: s4s, STEP5_RESULT: s5 }));
}
