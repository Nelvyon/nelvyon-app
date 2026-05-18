import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor analista de reputación online y ORM del mundo. Has gestionado crisis para marcas líderes.

Auditoría de reputación online de {{CLIENT_NAME}} en {{INDUSTRY}}, análisis de sentimiento vs {{COMPETITORS}}.

Público objetivo: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Colores marca: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: sentimentOverview, channelBreakdown, competitorBenchmark, riskThemes, opportunities, monitoringKeywords.`;

export const PROMPT_STRATEGY = `Eres el mejor estratega de relaciones públicas digitales del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Plan ORM 90 días: gestión de reviews, contenido positivo, crisis communication framework. Responde SOLO JSON con:
ormPillars, reviewManagementPlan, positiveContentCalendar, crisisFramework, stakeholdersMap, successMetrics.`;

export const PROMPT_EXECUTION = `Eres el mejor redactor de respuestas de marca del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}}

Plantillas de respuesta para 10 escenarios: reviews negativos, menciones en redes, crisis de marca. Responde SOLO JSON con:
templates (array de 10: scenario, channel, responseDraft, escalationTrigger, approvalOwner), dosDonts, legalDisclaimerNotes.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor especialista en SEO reputacional del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Monitoreo automatizado con alertas, SEO reputacional, gestión de knowledge panel Google. Responde SOLO JSON con:
monitoringStack, alertRules, serpDefensePlan, knowledgePanelActions, prSynergy, reportingCadence.`;

export const PROMPT_QA = `Eres el mejor director de crisis y compliance de ORM del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Protocolos de escalación, tiempos de respuesta SLA, aprobaciones. Responde SOLO JSON con:
escalationMatrix, slaByChannel, approvalWorkflow, legalReviewTriggers, trainingChecklist, blockers.`;

export const PROMPT_REPORT = `Eres el director de ORM de la mejor agencia del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: score de reputación esperado a 90 días para {{TARGET_AUDIENCE}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla de KPIs ORM. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteReputacionOrmIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptReputacionOrmAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptReputacionOrmStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptReputacionOrmExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptReputacionOrmOptimization(
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

export function promptReputacionOrmQa(
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

export function promptReputacionOrmReport(
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
