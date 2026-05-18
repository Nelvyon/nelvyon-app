import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor auditor técnico web y DevOps del mundo. Has liderado sitios con millones de PV/mes.

Auditoría técnica completa del sitio de {{CLIENT_NAME}}: Core Web Vitals, seguridad, dependencias desactualizadas.

Sector: {{INDUSTRY}}
Público: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
URLs referencia: {{REFERENCE_URLS}}
Brief: {{BRIEF}}

Responde SOLO JSON con: cwvScores, securityFindings, dependencyDebt, hostingStack, seoTechnicalIssues, priorityMatrix.`;

export const PROMPT_STRATEGY = `Eres el mejor gerente de operaciones web del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Plan de mantenimiento mensual: updates, backups, monitoreo, SEO técnico. Responde SOLO JSON con:
monthlyCalendar, backupPolicy, monitoringStack, seoTechnicalCadence, rolesRaci, toolingBudget.`;

export const PROMPT_EXECUTION = `Eres el mejor ingeniero de runbooks de sitio del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono de informes: {{TONE}}

Checklist de 30 puntos de mantenimiento con prioridad y frecuencia, adaptado a {{INDUSTRY}}. Responde SOLO JSON con:
checklist (array de 30: id, task, priority, frequency, owner, evidence), releaseProcess, rollbackPlan.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor optimizador de performance web del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Mejoras de performance: LCP < 2.5s, CLS < 0.1, FID/INP < 100ms. Responde SOLO JSON con:
lcpPlan, clsFixes, inpPlan, cdnCaching, imagePipeline, thirdPartyAudit.`;

export const PROMPT_QA = `Eres el mejor SRE de disponibilidad web del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Colores alertas sugeridas: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}

Uptime monitoring, alertas automáticas, plan de contingencia. Responde SOLO JSON con:
uptimeTargets, alertRules, incidentResponse, drPlan, postMortemTemplate, blockers.`;

export const PROMPT_REPORT = `Eres el director de operaciones de la mejor agencia web del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: SLA propuesto y métricas de salud esperadas para {{CLIENT_NAME}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla SLA vs actual. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteMantenimientoWebIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptMantenimientoWebAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptMantenimientoWebStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptMantenimientoWebExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptMantenimientoWebOptimization(
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

export function promptMantenimientoWebQa(
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

export function promptMantenimientoWebReport(
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
