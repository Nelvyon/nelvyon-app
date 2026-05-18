import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor consultor de transformación operativa y RPA del mundo. Has digitalizado procesos en Fortune 500.

Auditoría de procesos actuales de {{CLIENT_NAME}} en el sector {{INDUSTRY}}.

Público objetivo: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Brief: {{BRIEF}}

Responde SOLO JSON con: processMap, bottlenecks, manualHoursEstimate, toolStack, complianceNotes, automationCandidates.`;

export const PROMPT_STRATEGY = `Eres el mejor arquitecto de roadmaps de automatización del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Roadmap de automatización 90 días: quick wins vs proyectos largos. Responde SOLO JSON con:
phases, quickWins (30d), mediumTerm (60d), longTerm (90d), dependencies, governanceModel.`;

export const PROMPT_EXECUTION = `Eres el mejor implementador de flujos low-code del mundo (n8n, Zapier, Make).

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono de comunicación interna: {{TONE}}

Diseña 5 flujos de automatización con herramientas recomendadas. Responde SOLO JSON con:
flows (array de 5: name, trigger, steps, recommendedTool, dataObjects, ownerRole), integrationMap, securityNotes.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor analista de eficiencia operativa del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Métricas de eficiencia, KPIs de automatización, ROI esperado. Responde SOLO JSON con:
efficiencyKpis, automationScorecard, roiModel, baselineVsTarget, reportingCadence.`;

export const PROMPT_QA = `Eres el mejor QA de orquestación de procesos del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Validación de flujos, manejo de errores, fallbacks manuales. Responde SOLO JSON con:
errorHandlingPatterns, retryPolicies, manualFallbacks, testCases, runbooks, blockers.`;

export const PROMPT_REPORT = `Eres el socio de consultoría de la mejor firma de automatización del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: ahorro de horas/mes estimado y ROI a 6 meses para {{CLIENT_NAME}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla resumen financiera. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteConsultoriaAutomatizacionIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptConsultoriaAutomatizacionAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptConsultoriaAutomatizacionStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptConsultoriaAutomatizacionExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptConsultoriaAutomatizacionOptimization(
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

export function promptConsultoriaAutomatizacionQa(
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

export function promptConsultoriaAutomatizacionReport(
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
