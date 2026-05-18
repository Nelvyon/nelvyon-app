import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor director de arte y diseño de identidad del mundo. Has liderado sistemas visuales para marcas globales con coherencia pixel-perfect.

Auditoría visual de marca de {{CLIENT_NAME}} y benchmarks del sector {{INDUSTRY}}.

Público objetivo: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores marca: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: brandVisualAudit, sectorBenchmarks, gaps, strengths, risks, quickWins.`;

export const PROMPT_STRATEGY = `Eres el mejor diseñador de sistemas visuales del mundo. Referencias: IBM Carbon, Atlassian, Stripe.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Define sistema visual completo: paleta, tipografía, iconografía, grid. Responde SOLO JSON con:
colorSystem, typographyScale, iconographyRules, layoutGrid, componentPrinciples, dosDonts.`;

export const PROMPT_EXECUTION = `Eres el mejor creativo de branding del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}}

Brief creativo para 10 piezas: variantes de logo, plantillas social, brand book, papelería. Usa {{PRIMARY_COLOR}} y {{SECONDARY_COLOR}} de forma explícita.

Responde SOLO JSON con:
deliverables (array de 10: name, format, specs, usageNotes), brandBookOutline, socialTemplates, stationeryPack.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor diseñador multicanal del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Adaptaciones por canal, versiones responsive, modo claro/oscuro. Responde SOLO JSON con:
channelAdaptations, responsiveBreakpoints, darkLightVariants, exportSpecs, assetHandoffNotes.`;

export const PROMPT_QA = `Eres el mejor revisor de accesibilidad visual del mundo (WCAG).

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Colores: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}

Consistencia visual, contraste WCAG AA, legibilidad en todos los tamaños. Responde SOLO JSON con:
contrastChecks, readabilityNotes, consistencyAudit, blockers, signOffCriteria.`;

export const PROMPT_REPORT = `Eres el director creativo de la mejor agencia de diseño del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: impacto esperado en reconocimiento de marca para {{TARGET_AUDIENCE}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla de entregables y próximos pasos. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

/** Campos de intake usados en prompts (placeholders {{VAR}}). */
export function eliteDisenoGraficoIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptDisenoGraficoAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptDisenoGraficoStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptDisenoGraficoExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptDisenoGraficoOptimization(
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

export function promptDisenoGraficoQa(
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

export function promptDisenoGraficoReport(
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
