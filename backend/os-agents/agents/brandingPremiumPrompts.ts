import type { OsJobPayload } from "../types";
import { buildPrompt } from "./webPremiumPrompts";
import { eliteCommonIntakeStrings } from "./elitePayloadStrings";

export const PROMPT_BRANDING_AUDIT = `Eres el mejor brand strategist del mundo. Has auditado identidades para Coca-Cola, IBM y Patagonia.

Datos reales del intake:
Cliente: {clientName}
Sector: {industry}
Audiencia: {targetAudience}
Tono: {tone}
Competidores: {competitors}
Colores: {primaryColor} / {secondaryColor}
Referencias: {referenceUrls}
Brief: {brief}

Auditoría de marca actual y oportunidades. Responde SOLO JSON con:
brandEquitySignals, perceptionGaps, verbalIdentityAudit, visualIdentityAudit, competitorCodes, opportunities, auditSummary.`;

export const PROMPT_BRANDING_STRATEGY = `Eres el mejor arquitecto de marca del mundo. Referencias: Interbrand, Landor, Pentagram.

Análisis previo:
{step1Result}

Cliente: {clientName} | Sector: {industry} | Tono: {tone}

Estrategia de marca: misión, visión, valores, posicionamiento. Responde SOLO JSON con:
mission, vision, values (array), positioningStatement, brandPillars, narrativeArc, taglineOptions.`;

export const PROMPT_BRANDING_VISUAL_IDENTITY = `Eres el mejor director de identidad visual del mundo. Has definido sistemas para Airbnb y Spotify.

Paso 1: {step1Result}
Paso 2: {step2Result}

Colores cliente: {primaryColor}, {secondaryColor} | Referencias: {referenceUrls}

Sistema de identidad visual: logo, colores, tipografía, iconografía. Responde SOLO JSON con:
logoDirection, colorSystem, typographySystem, iconographyStyle, imageryStyle, motionPrinciples, dosAndDonts.`;

export const PROMPT_BRANDING_VOICE = `Eres el mejor tone-of-voice lead del mundo. Has escrito guidelines para Slack y Duolingo.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}

Tono declarado: {tone} | Audiencia: {targetAudience}

Voz y tono de marca — guidelines. Responde SOLO JSON con:
voiceAttributes, samplePhrases, channelShifts, vocabulary, wordsToAvoid, socialVsB2b, crisisToneNote.`;

export const PROMPT_BRANDING_APPLICATIONS = `Eres el mejor diseñador de aplicaciones de marca del mundo. Referencias: identidades omnicanal de Apple y Google.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}
Paso 4: {step4Result}

Cliente: {clientName} | Competidores: {competitors}

Aplicaciones de marca: web, social, print, packaging. Responde SOLO JSON con:
webApplication, socialTemplates, printSystem, packagingCues, partnerCoBranding, accessibilityCommitments.`;

export const PROMPT_BRANDING_DELIVERY_REPORT = `Eres el CEO de la mejor agencia de branding del mundo. Entregas el brand book ejecutivo a {clientName}.

Markdown completo que integre:
- Auditoría: {step1Result}
- Estrategia: {step2Result}
- Identidad visual (extracto): {step3Summary}
- Voz (extracto): {step4Summary}
- Aplicaciones: {step5Result}

Incluye checklist de gobierno de marca. Cierra con:

Ejecutado por NELVYON OS`;

function mergeVars(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptBrandingAudit(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_BRANDING_AUDIT, eliteCommonIntakeStrings(payload));
}

export function promptBrandingStrategy(step1Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_BRANDING_STRATEGY, mergeVars(eliteCommonIntakeStrings(payload), { step1Result }));
}

export function promptBrandingVisual(step1Result: string, step2Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_BRANDING_VISUAL_IDENTITY, mergeVars(eliteCommonIntakeStrings(payload), { step1Result, step2Result }));
}

export function promptBrandingVoice(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_BRANDING_VOICE, mergeVars(eliteCommonIntakeStrings(payload), { step1Result, step2Result, step3Result }));
}

export function promptBrandingApplications(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  step4Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_BRANDING_APPLICATIONS, mergeVars(eliteCommonIntakeStrings(payload), { step1Result, step2Result, step3Result, step4Result }));
}

export function promptBrandingDeliveryReport(
  clientName: string,
  step1Result: string,
  step2Result: string,
  step3Summary: string,
  step4Summary: string,
  step5Result: string,
): string {
  return buildPrompt(PROMPT_BRANDING_DELIVERY_REPORT, {
    clientName,
    step1Result,
    step2Result,
    step3Summary,
    step4Summary,
    step5Result,
  });
}
