import type { OsJobPayload } from "../types";
import { prependRealDataToPrompt } from "../contextEnricher";
import { buildPrompt } from "./webPremiumPrompts";
import { eliteSeoIntakeStrings } from "./elitePayloadStrings";

export const PROMPT_SEO_AUDIT = `Eres el mejor auditor SEO del mundo. Has auditado sitios Fortune 500 y marketplaces con tráfico orgánico masivo (Amazon, Booking, Expedia como referencia de escala).

Datos reales del intake:
Cliente: {clientName}
Sector: {industry}
Público: {targetAudience}
Tono: {tone}
Competidores: {competitors}
Colores marca: {primaryColor} / {secondaryColor}
Web actual: {currentWebsiteUrl}
Keywords objetivo: {targetKeywords}
Objetivo SEO: {mainGoal}
Brief: {brief}

Auditoría SEO completa del negocio y sector. Responde SOLO JSON con:
technicalBaseline, contentBaseline, authoritySignals, competitorSeoSnapshot, quickWins, criticalIssues, auditScore (string 0-100).`;

export const PROMPT_SEO_KEYWORD_RESEARCH = `Eres el mejor investigador de keywords del mundo. Referencias de rigor: Ahrefs, Semrush, Google SGE landscape.

Auditoría previa:
{step1Result}

Cliente: {clientName} | Sector: {industry} | Audiencia: {targetAudience}
Keywords semilla: {targetKeywords} | Objetivo: {mainGoal}

Investigación de palabras clave con intención. Responde SOLO JSON con:
clusters (array de { headTerm, intent, modifiers, priority }), serpFeaturesToTarget, cannibalizationRisks, contentGapsVsCompetitors, recommendedPrimaryTerms.`;

export const PROMPT_SEO_CONTENT_STRATEGY = `Eres el mejor estratega de contenido SEO del mundo. Has liderado hubs para HubSpot, Shopify y Notion.

Paso 1: {step1Result}
Paso 2: {step2Result}

Cliente: {clientName} | Tono: {tone} | Competidores: {competitors}

Estrategia de contenido para posicionar. Responde SOLO JSON con:
pillarTopics, supportingArticles, editorialGuidelines, eeatPlan, refreshCadence, internalLinkingMap, measurementKpis.`;

export const PROMPT_SEO_TECHNICAL = `Eres el mejor SEO técnico del mundo. Has resuelto indexación a escala para eBay y Mercado Libre.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}

Cliente: {clientName} | Sector: {industry} | Referencias: {referenceUrls}

Recomendaciones técnicas prioritarias. Responde SOLO JSON con:
crawlBudget, indexationRules, hreflangIfNeeded, structuredDataPlan, performanceBudget, javascriptSeoNotes, priorityTickets (array de strings).`;

export const PROMPT_SEO_LINK_BUILDING = `Eres el mejor estratega de autoridad de dominio del mundo. Referencias: estrategias white-hat de marcas líderes en YMYL.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}
Paso 4: {step4Result}

Cliente: {clientName} | Competidores: {competitors} | Keywords: {targetKeywords}

Estrategia de link building y DR. Responde SOLO JSON con:
linkableAssets, outreachAngles, digitalPrHooks, partnerships, toxicityAvoidance, monthlyVelocity, successMetrics.`;

export const PROMPT_SEO_DELIVERY_REPORT = `Eres el CEO de la mejor agencia SEO del mundo. Presentas el plan a {clientName}.

Markdown ejecutivo con plan de acción 90 días que integre:
- Auditoría: {step1Result}
- Keywords: {step2Result}
- Contenido (extracto): {step3Summary}
- Técnico (extracto): {step4Summary}
- Link building: {step5Result}

Incluye hitos semanales y KPIs. Cierra con la línea:

Ejecutado por NELVYON OS`;

function mergeVars(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptSeoAudit(payload: OsJobPayload): string {
  return prependRealDataToPrompt(payload, buildPrompt(PROMPT_SEO_AUDIT, eliteSeoIntakeStrings(payload)));
}

export function promptSeoKeywordResearch(step1Result: string, payload: OsJobPayload): string {
  return prependRealDataToPrompt(
    payload,
    buildPrompt(PROMPT_SEO_KEYWORD_RESEARCH, mergeVars(eliteSeoIntakeStrings(payload), { step1Result })),
  );
}

export function promptSeoContentStrategy(step1Result: string, step2Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_SEO_CONTENT_STRATEGY, mergeVars(eliteSeoIntakeStrings(payload), { step1Result, step2Result }));
}

export function promptSeoTechnical(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_SEO_TECHNICAL, mergeVars(eliteSeoIntakeStrings(payload), { step1Result, step2Result, step3Result }));
}

export function promptSeoLinkBuilding(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  step4Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_SEO_LINK_BUILDING, mergeVars(eliteSeoIntakeStrings(payload), { step1Result, step2Result, step3Result, step4Result }));
}

export function promptSeoDeliveryReport(
  clientName: string,
  step1Result: string,
  step2Result: string,
  step3Summary: string,
  step4Summary: string,
  step5Result: string,
): string {
  return buildPrompt(PROMPT_SEO_DELIVERY_REPORT, {
    clientName,
    step1Result,
    step2Result,
    step3Summary,
    step4Summary,
    step5Result,
  });
}
