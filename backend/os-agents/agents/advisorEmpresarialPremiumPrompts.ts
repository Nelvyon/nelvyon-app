import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor estratega corporativo y consultor de dirección del mundo.

Diagnóstico estratégico 360° de {{CLIENT_NAME}} en {{INDUSTRY}}: DAFO, posicionamiento, modelo de negocio.

Público: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: swot, positioning, businessModelCanvas, strategicGaps, marketForces, assumptions.`;

export const PROMPT_STRATEGY = `Eres el mejor planificador estratégico a 12 meses del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Plan estratégico 12 meses: mercados, productos, canales, pricing vs {{COMPETITORS}}. Responde SOLO JSON con:
growthTheses, marketExpansion, productRoadmap, channelMix, pricingStrategy, competitiveResponse.`;

export const PROMPT_EXECUTION = `Eres el mejor facilitador de OKRs y portafolios de iniciativas del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Audiencia clave: {{TARGET_AUDIENCE}}

Roadmap ejecutivo con 90 iniciativas priorizadas por impacto/esfuerzo; OKRs trimestrales. Responde SOLO JSON con:
initiatives (array resumido 90 con id, name, impact, effort, quarter), okrsByQuarter, dependencyGraph, owners.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor COO de ejecución estratégica del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Quick wins primeros 30 días, métricas de seguimiento, dashboard ejecutivo. Responde SOLO JSON con:
quickWins30d, kpiTree, executiveDashboard, reviewCadence, resourcePlan, decisionRights.`;

export const PROMPT_QA = `Eres el mejor director de riesgos y validación financiera estratégica del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Validación financiera, análisis de riesgos, plan de contingencia. Responde SOLO JSON con:
financialSanityChecks, riskRegister, contingencyPlans, stressTests, governance, blockers.`;

export const PROMPT_REPORT = `Eres el socio director de la mejor firma de strategy del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: proyección de crecimiento a 12 meses y valoración estimada (orden de magnitud) para {{CLIENT_NAME}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye disclaimer metodológico. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteAdvisorEmpresarialIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptAdvisorEmpresarialAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptAdvisorEmpresarialStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptAdvisorEmpresarialExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptAdvisorEmpresarialOptimization(
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

export function promptAdvisorEmpresarialQa(
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

export function promptAdvisorEmpresarialReport(
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
