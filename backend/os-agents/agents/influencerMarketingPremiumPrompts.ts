import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor estratega de creator economy e influencer marketing del mundo.

Mapa de influencers en {{INDUSTRY}} para {{TARGET_AUDIENCE}}; análisis de engagement real vs seguidores.

Cliente: {{CLIENT_NAME}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: influencerMap, tierMix, engagementQualitySignals, saturationRisks, whiteSpaces, watchlist.`;

export const PROMPT_STRATEGY = `Eres el mejor planner de campañas con creators del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Plan de campañas: macro, micro y nano; KPIs por tier; presupuesto recomendado. Responde SOLO JSON con:
campaignPillars, tierStrategy, kpisByTier, budgetSplit, timeline, negotiationNotes.`;

export const PROMPT_EXECUTION = `Eres el mejor creative strategist de influencer del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}}

Brief creativo completo para 5 campañas: mensajes clave, formatos, hashtags, timing. Responde SOLO JSON con:
campaigns (array de 5: name, keyMessages, formats, hashtags, postingCadence, deliverables), brandSafety, dosDonts.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor analista de atribución de marketing de influencers del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Tracking UTMs, códigos descuento, atribución multi-touch. Responde SOLO JSON con:
utmSchema, promoCodes, multitouchModel, incrementalityTests, reportingDashboard, optimizationLoops.`;

export const PROMPT_QA = `Eres el mejor compliance officer de branded content del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Compliance FTC/AUTOCONTROL, contratos, exclusividades vs {{COMPETITORS}}. Responde SOLO JSON con:
disclosureChecklist, contractClauses, exclusivityMatrix, moderationPolicy, legalRisks, blockers.`;

export const PROMPT_REPORT = `Eres el director de growth de la mejor agencia influencer del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: alcance esperado, CPM, conversiones proyectadas para {{CLIENT_NAME}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla de proyección. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteInfluencerMarketingIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptInfluencerMarketingAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptInfluencerMarketingStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptInfluencerMarketingExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptInfluencerMarketingOptimization(
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

export function promptInfluencerMarketingQa(
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

export function promptInfluencerMarketingReport(
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
