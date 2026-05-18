import type { OsJobPayload } from "../types";
import { buildPrompt } from "./webPremiumPrompts";
import { eliteSocialIntakeStrings } from "./elitePayloadStrings";

export const PROMPT_SOCIAL_AUDIT = `Eres el mejor social media strategist del mundo. Has liderado presencias para Red Bull, Glossier y Nike en TikTok e Instagram.

Datos reales del intake:
Cliente: {clientName}
Sector: {industry}
Audiencia: {targetAudience}
Tono: {tone}
Competidores: {competitors}
Colores: {primaryColor} / {secondaryColor}
Plataformas sociales: {socialPlatforms}
Frecuencia publicación: {postFrequency}
Estilo contenido: {contentStyle}
Brief: {brief}

Auditoría de presencia social actual. Responde SOLO JSON con:
platformAudit, contentPillarsToday, engagementSignals, competitorSocialCodes, whitespaceOpportunities, risks, summaryScore.`;

export const PROMPT_SOCIAL_CONTENT_STRATEGY = `Eres el mejor planner de contenido social del mundo. Referencias: estrategias de Netflix y Spotify en social-first.

Auditoría:
{step1Result}

Cliente: {clientName} | Plataformas: {socialPlatforms} | Frecuencia: {postFrequency} | Estilo: {contentStyle}

Estrategia de contenido por plataforma. Responde SOLO JSON con:
platformPlaybooks (array con platform, objective, formats, postingRhythm), heroCampaignIdeas, ugcPlan, influencerPosture, measurementMap.`;

export const PROMPT_SOCIAL_CALENDAR = `Eres el mejor editor de calendarios sociales del mundo. Has coordinado launches globales en Meta Business Suite.

Paso 1: {step1Result}
Paso 2: {step2Result}

Tono: {tone} | Competidores: {competitors}

Calendario editorial 30 días con temas y formatos. Responde SOLO JSON con:
weeks (array de 4 semanas, cada una con days: array de { day, theme, format, hook, cta }), assetChecklist, approvalFlow.`;

export const PROMPT_SOCIAL_COMMUNITY = `Eres el mejor community manager estratégico del mundo. Has escala comunidades para Discord y Patreon enterprise.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}

Cliente: {clientName} | Audiencia: {targetAudience}

Estrategia de comunidad y engagement. Responde SOLO JSON con:
communityPrinciples, moderationPolicy, engagementRituals, crisisPlaybook, ambassadorProgram, dmWorkflow.`;

export const PROMPT_SOCIAL_ANALYTICS = `Eres el mejor analista de growth social del mundo. Referencias: frameworks de Meta y TikTok Analytics.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}
Paso 4: {step4Result}

Plataformas: {socialPlatforms}

KPIs, métricas y reporting mensual. Responde SOLO JSON con:
northStarMetric, supportingKpis, dashboardLayout, weeklyReviewAgenda, monthlyReportOutline, benchmarkingVsCompetitors.`;

export const PROMPT_SOCIAL_DELIVERY_REPORT = `Eres el CEO de la mejor agencia social del mundo. Presentas la estrategia a {clientName}.

Markdown con estrategia completa y primeros 30 días planificados:
- Auditoría: {step1Result}
- Estrategia contenido: {step2Result}
- Calendario (extracto): {step3Summary}
- Comunidad (extracto): {step4Summary}
- Analytics: {step5Result}

Incluye tabla de hitos semana 1-4. Cierra con:

Ejecutado por NELVYON OS`;

function mergeVars(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptSocialAudit(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_SOCIAL_AUDIT, eliteSocialIntakeStrings(payload));
}

export function promptSocialContentStrategy(step1Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_SOCIAL_CONTENT_STRATEGY, mergeVars(eliteSocialIntakeStrings(payload), { step1Result }));
}

export function promptSocialCalendar(step1Result: string, step2Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_SOCIAL_CALENDAR, mergeVars(eliteSocialIntakeStrings(payload), { step1Result, step2Result }));
}

export function promptSocialCommunity(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_SOCIAL_COMMUNITY, mergeVars(eliteSocialIntakeStrings(payload), { step1Result, step2Result, step3Result }));
}

export function promptSocialAnalytics(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  step4Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_SOCIAL_ANALYTICS, mergeVars(eliteSocialIntakeStrings(payload), { step1Result, step2Result, step3Result, step4Result }));
}

export function promptSocialDeliveryReport(
  clientName: string,
  step1Result: string,
  step2Result: string,
  step3Summary: string,
  step4Summary: string,
  step5Result: string,
): string {
  return buildPrompt(PROMPT_SOCIAL_DELIVERY_REPORT, {
    clientName,
    step1Result,
    step2Result,
    step3Summary,
    step4Summary,
    step5Result,
  });
}
