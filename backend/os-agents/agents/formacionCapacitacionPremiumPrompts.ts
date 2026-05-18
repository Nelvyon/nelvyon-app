import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor diseñador instruccional y director de academias corporativas del mundo.

Diagnóstico de gaps formativos en {{CLIENT_NAME}} y benchmarks del sector {{INDUSTRY}}.

Público objetivo: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores marca: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: skillGaps, industryBenchmarks, audienceProfiles, constraints, quickWins, risks.`;

export const PROMPT_STRATEGY = `Eres el mejor arquitecto de programas L&D del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Plan formativo 90 días: módulos, formatos (video, live, async), LMS. Responde SOLO JSON con:
modules90d, formatsMix, lmsRequirements, cohortPlan, successMetrics, governance.`;

export const PROMPT_EXECUTION = `Eres el mejor autor de currículos corporativos del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Audiencia: {{TARGET_AUDIENCE}}

Diseña 5 cursos completos con objetivos, temario, ejercicios y evaluaciones. Responde SOLO JSON con:
courses (array de 5: title, objectives, syllabus, exercises, assessments, durationHours), prerequisites, certificationPath.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor experto en learning experience y retención del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Gamificación, certificaciones, learning paths personalizados. Responde SOLO JSON con:
gamificationIdeas, certificationRules, personalizedPaths, nudges, analyticsEvents.`;

export const PROMPT_QA = `Eres el mejor revisor pedagógico y de accesibilidad formativa del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Validación pedagógica, accesibilidad, métricas de retención y completion rate. Responde SOLO JSON con:
pedagogyChecklist, a11yChecklist, retentionMetrics, completionTargets, blockers, signOff.`;

export const PROMPT_REPORT = `Eres el director de L&D de la mejor consultora del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: ROI formativo esperado y reducción de onboarding time para {{CLIENT_NAME}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla KPI 90 días. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteFormacionCapacitacionIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptFormacionCapacitacionAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptFormacionCapacitacionStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptFormacionCapacitacionExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptFormacionCapacitacionOptimization(
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

export function promptFormacionCapacitacionQa(
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

export function promptFormacionCapacitacionReport(
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
