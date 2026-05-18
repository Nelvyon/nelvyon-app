import type { OsJobPayload } from "../types";
import { prependRealDataToPrompt } from "../contextEnricher";
import { buildPrompt } from "./webPremiumPrompts";
import { eliteAdsIntakeStrings } from "./elitePayloadStrings";

export const PROMPT_ADS_AUDIENCE_RESEARCH = `Eres el mejor media planner de performance del mundo. Has escalado presupuestos para Nike, Uber y Airbnb en multi-mercado.

Datos reales del intake:
Cliente: {clientName}
Sector: {industry}
Audiencia: {targetAudience}
Tono: {tone}
Competidores: {competitors}
Colores: {primaryColor} / {secondaryColor}
Plataformas: {adPlatforms}
Presupuesto mensual (€): {monthlyBudget}
Objetivo campaña: {campaignGoal}
Brief: {brief}

Investigación de audiencias y segmentación. Responde SOLO JSON con:
personas, affinitySignals, exclusionRules, geoStrategy, deviceStrategy, creativeHooksBySegment, privacyComplianceNotes.`;

export const PROMPT_ADS_CAMPAIGN_STRATEGY = `Eres el mejor estratega de campañas paid del mundo. Referencias: Google Marketing Live, Meta Advantage+, TikTok For Business.

Análisis audiencias:
{step1Result}

Cliente: {clientName} | Plataformas: {adPlatforms} | Presupuesto/mes: {monthlyBudget}€ | Objetivo: {campaignGoal}

Estrategia de campañas por plataforma (Google/Meta/TikTok). Responde SOLO JSON con:
campaignArchitecture, budgetSplit, biddingPhilosophy, creativeTestingPlan, landingPageAlignment, remarketingLayers, guardrails.`;

export const PROMPT_ADS_CREATIVE = `Eres el mejor creative director de performance del mundo. Has producido anuncios para Apple y Spotify con DR best-in-class.

Paso 1: {step1Result}
Paso 2: {step2Result}

Cliente: {clientName} | Tono: {tone} | Competidores: {competitors}

Copy y creatividades para anuncios. Responde SOLO JSON con:
headlines (array), descriptions (array), ctaSet, ugcScripts, staticConcepts, videoHooks, brandSafetyChecklist.`;

export const PROMPT_ADS_BIDDING = `Eres el mejor especialista en pujas y presupuesto del mundo. Has optimizado ROAS en retail y SaaS global.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}

Presupuesto mensual: {monthlyBudget}€ | Objetivo: {campaignGoal} | Plataformas: {adPlatforms}

Estrategia de pujas y presupuesto. Responde SOLO JSON con:
biddingModelsByPlatform, dayparting, budgetPacing, marginalRoasTargets, experimentationQueue, riskControls.`;

export const PROMPT_ADS_TRACKING = `Eres el mejor arquitecto de medición de ads del mundo. Referencias: GA4, server-side tagging, CAPI.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}
Paso 4: {step4Result}

Cliente: {clientName} | Sector: {industry}

Plan de tracking y conversiones. Responde SOLO JSON con:
conversionDefinitions, pixelServerPlan, attributionModel, offlineConversionsIfAny, dashboardKpis, qaChecklist.`;

export const PROMPT_ADS_DELIVERY_REPORT = `Eres el CEO de la mejor agencia performance del mundo. Presentas resultados a {clientName}.

Markdown con proyecciones de ROI y plan de lanzamiento integrando:
- Audiencias: {step1Result}
- Estrategia campañas: {step2Result}
- Creatividades (extracto): {step3Summary}
- Pujas (extracto): {step4Summary}
- Tracking: {step5Result}

Incluye calendario de lanzamiento 14 días. Cierra con:

Ejecutado por NELVYON OS`;

function mergeVars(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptAdsAudienceResearch(payload: OsJobPayload): string {
  return prependRealDataToPrompt(
    payload,
    buildPrompt(PROMPT_ADS_AUDIENCE_RESEARCH, eliteAdsIntakeStrings(payload)),
  );
}

export function promptAdsCampaignStrategy(step1Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ADS_CAMPAIGN_STRATEGY, mergeVars(eliteAdsIntakeStrings(payload), { step1Result }));
}

export function promptAdsCreative(step1Result: string, step2Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ADS_CREATIVE, mergeVars(eliteAdsIntakeStrings(payload), { step1Result, step2Result }));
}

export function promptAdsBidding(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_ADS_BIDDING, mergeVars(eliteAdsIntakeStrings(payload), { step1Result, step2Result, step3Result }));
}

export function promptAdsTracking(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  step4Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_ADS_TRACKING, mergeVars(eliteAdsIntakeStrings(payload), { step1Result, step2Result, step3Result, step4Result }));
}

export function promptAdsDeliveryReport(
  clientName: string,
  step1Result: string,
  step2Result: string,
  step3Summary: string,
  step4Summary: string,
  step5Result: string,
): string {
  return buildPrompt(PROMPT_ADS_DELIVERY_REPORT, {
    clientName,
    step1Result,
    step2Result,
    step3Summary,
    step4Summary,
    step5Result,
  });
}
