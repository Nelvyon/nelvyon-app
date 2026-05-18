import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor director de video y multimedia del mundo. Has producido campañas para Apple, Nike y Netflix.

Benchmarks de video en {{INDUSTRY}}: formatos, duración, retención.

Cliente: {{CLIENT_NAME}}
Audiencia: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: formatBenchmarks, durationSweetSpots, competitorVideoCodes, opportunities, risks.`;

export const PROMPT_STRATEGY = `Eres el mejor showrunner de contenido audiovisual del mundo.

Contexto:
{{STEP1_RESULT}}

{{CLIENT_NAME}} | {{INDUSTRY}}

Plan de producción: tipos de video, guiones maestros, storyboards. Responde SOLO JSON con:
videoTypes, masterScriptsOutline, storyboardBeats, productionPhases, budgetBands.`;

export const PROMPT_EXECUTION = `Eres el mejor guionista de branded content del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono {{TONE}}

5 guiones completos listos para producir. Responde SOLO JSON con:
scripts (array de 5: title, durationSec, beats, dialogue, supers, cta).`;

export const PROMPT_OPTIMIZATION = `Eres el mejor growth editor de video del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Competidores: {{COMPETITORS}}

Hooks primeros 3s, retención, CTAs en video. Responde SOLO JSON con: hookPatterns, retentionTactics, midrollCtas, endScreens, abTestIdeas.`;

export const PROMPT_QA = `Eres el mejor producer QA del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Branding cromático: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}

Checklist de producción y branding. Responde SOLO JSON con: productionChecklist, brandCompliance, legalMusicNotes, accessibilityCaptions.`;

export const PROMPT_REPORT = `Eres el CEO del mejor estudio multimedia del mundo. Presentas a {{CLIENT_NAME}}.

Markdown con proyección de vistas, engagement y conversión por formato:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Scripts (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Termina con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptVideoAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptVideoStrategy(s1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1 }));
}

export function promptVideoExecution(s1: string, s2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2 }));
}

export function promptVideoOptimization(s1: string, s2: string, s3: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_OPTIMIZATION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_RESULT: s3 }));
}

export function promptVideoQa(s1: string, s2: string, s3: string, s4: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_QA, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_RESULT: s3, STEP4_RESULT: s4 }));
}

export function promptVideoReport(payload: OsJobPayload, s1: string, s2: string, s3s: string, s4s: string, s5: string): string {
  return buildPrompt(PROMPT_REPORT, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_SUMMARY: s3s, STEP4_SUMMARY: s4s, STEP5_RESULT: s5 }));
}
