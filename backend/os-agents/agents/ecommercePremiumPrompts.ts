import type { OsJobPayload } from "../types";
import { buildPrompt } from "./webPremiumPrompts";
import { eliteCommonIntakeStrings } from "./elitePayloadStrings";

export const PROMPT_ECOMMERCE_MARKET_ANALYSIS = `Eres el mejor estratega de ecommerce del mundo. Has definido el crecimiento de marcas como Shopify Plus, Allbirds y Patagonia frente a Amazon.

Contexto del cliente (datos reales del intake):
Cliente: {clientName}
Sector: {industry}
Público objetivo: {targetAudience}
Tono: {tone}
Competidores: {competitors}
Colores de marca: {primaryColor} / {secondaryColor}
Referencias: {referenceUrls}
Brief: {brief}

Analiza mercado, competencia y oportunidad del ecommerce. Responde SOLO en JSON estructurado con claves:
marketGap, competitorBenchmarks (array de objetos con name, strength, weakness), opportunitySizing, pricingPosture, channelMix, risks, recommendations (array de strings).`;

export const PROMPT_ECOMMERCE_STORE_ARCHITECTURE = `Eres el mejor arquitecto UX de ecommerce del mundo. Has diseñado experiencias para Nike SNKRS, Apple Store online y Farfetch.

Análisis previo (JSON):
{step1Result}

Datos del cliente:
{clientName} | {industry} | {targetAudience} | Tono: {tone} | Competidores: {competitors} | Colores: {primaryColor}, {secondaryColor}

Define estructura de tienda, categorías, navegación y UX. Responde SOLO JSON con:
informationArchitecture (array de nodos con id, label, parentId), navigationModel, categoryStrategy, searchAndFilter, pdpTemplate, cartAndCheckoutFlow, mobileFirstNotes.`;

export const PROMPT_ECOMMERCE_PRODUCT_STRATEGY = `Eres el mejor merchandising y product strategist del mundo. Referencias: Glossier, Warby Parker, Casper.

Paso 1: {step1Result}
Paso 2: {step2Result}

Cliente: {clientName} | Sector: {industry} | Audiencia: {targetAudience} | Tono: {tone}

Estrategia de producto: descripciones, fotografía, pricing. Responde SOLO JSON con:
productPillars, descriptionFramework, photographyDirection, pricingTiers, bundlingIdeas, ugcStrategy, sampleProductBlocks (array de objetos con title, bullets, priceHint).`;

export const PROMPT_ECOMMERCE_CONVERSION_OPTIMIZATION = `Eres el mejor experto en CRO del mundo. Has optimizado funnels para Booking.com, Airbnb y Stripe Checkout.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}

Cliente: {clientName} | Competidores: {competitors} | Brief: {brief}

CRO: funnel, checkout, upsells, emails. Responde SOLO JSON con:
funnelStages, frictionPoints, checkoutOptimizations, upsellRules, emailFlows (array con name, trigger, goal), abTestIdeas, projectedLiftHypothesis.`;

export const PROMPT_ECOMMERCE_SEO = `Eres el mejor SEO técnico para ecommerce del mundo. Has trabajado con Zalando y Decathlon a escala internacional.

Paso 1: {step1Result}
Paso 2: {step2Result}
Paso 3: {step3Result}
Paso 4: {step4Result}

Cliente: {clientName} | Sector: {industry} | Referencias: {referenceUrls}

SEO ecommerce: product pages, schema, Core Web Vitals. Responde SOLO JSON con:
productPageSeoTemplate, collectionPageRules, schemaOrgPlan, coreWebVitalsChecklist, internalLinking, facetedNavigationPolicy, contentHubIdeas.`;

export const PROMPT_ECOMMERCE_DELIVERY_REPORT = `Eres el CEO de la mejor agencia de ecommerce del mundo. Presentas el proyecto final a {clientName}.

Genera un report ejecutivo en Markdown profesional (nivel McKinsey + agencia creativa top) que integre:
- Resumen ejecutivo
- Análisis de mercado: {step1Result}
- Arquitectura tienda/UX: {step2Result}
- Estrategia de producto (extracto): {step3Summary}
- CRO (extracto): {step4Summary}
- SEO ecommerce: {step5Result}

Incluye próximos pasos 30-60-90 días y KPIs. Cierra el documento exactamente con la línea:

Ejecutado por NELVYON OS`;

function mergeVars(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function promptEcommerceMarketAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ECOMMERCE_MARKET_ANALYSIS, eliteCommonIntakeStrings(payload));
}

export function promptEcommerceStoreArchitecture(step1Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ECOMMERCE_STORE_ARCHITECTURE, mergeVars(eliteCommonIntakeStrings(payload), { step1Result }));
}

export function promptEcommerceProductStrategy(step1Result: string, step2Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ECOMMERCE_PRODUCT_STRATEGY, mergeVars(eliteCommonIntakeStrings(payload), { step1Result, step2Result }));
}

export function promptEcommerceConversion(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_ECOMMERCE_CONVERSION_OPTIMIZATION, mergeVars(eliteCommonIntakeStrings(payload), { step1Result, step2Result, step3Result }));
}

export function promptEcommerceSeo(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  step4Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_ECOMMERCE_SEO, mergeVars(eliteCommonIntakeStrings(payload), { step1Result, step2Result, step3Result, step4Result }));
}

export function promptEcommerceDeliveryReport(
  clientName: string,
  step1Result: string,
  step2Result: string,
  step3Summary: string,
  step4Summary: string,
  step5Result: string,
): string {
  return buildPrompt(PROMPT_ECOMMERCE_DELIVERY_REPORT, {
    clientName,
    step1Result,
    step2Result,
    step3Summary,
    step4Summary,
    step5Result,
  });
}
