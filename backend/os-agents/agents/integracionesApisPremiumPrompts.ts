import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor arquitecto de integraciones enterprise del mundo. Has unificado stacks heterogéneos en banca y retail.

Ecosistema tecnológico actual de {{CLIENT_NAME}} y gaps de integración.

Sector: {{INDUSTRY}}
Público: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Referencias: {{REFERENCE_URLS}}
Brief: {{BRIEF}}

Responde SOLO JSON con: systemsInventory, dataFlows, integrationGaps, legacyRisks, priorities, assumptions.`;

export const PROMPT_STRATEGY = `Eres el mejor diseñador de plataformas API-first del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Arquitectura de integraciones: APIs prioritarias, webhooks, OAuth vs API key. Responde SOLO JSON con:
integrationArchitecture, authStrategy (oauthVsApiKey), webhookDesign, eventBusProposal, securityLayers, phasedRollout.`;

export const PROMPT_EXECUTION = `Eres el mejor ingeniero de especificaciones OpenAPI del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono documentación: {{TONE}}

Especificaciones técnicas de 5 integraciones clave: endpoints, payloads, errores, rate limits. Responde SOLO JSON con:
integrations (array de 5: name, baseUrl, endpoints, samplePayload, errorCodes, rateLimitPolicy), idempotencyRules, versioning.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor SRE de integraciones del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

Caching, retry logic, circuit breakers, monitoreo de uptime. Responde SOLO JSON con:
cachingStrategy, retryBackoff, circuitBreakerPolicy, observabilityStack, sloSli, onCallPlaybook.`;

export const PROMPT_QA = `Eres el mejor QA de contratos API del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Tests de integración, validación de schemas, seguridad de tokens. Responde SOLO JSON con:
contractTests, schemaValidationPlan, secretRotation, penetrationChecks, stagingStrategy, blockers.`;

export const PROMPT_REPORT = `Eres el CTO de la mejor consultora de integraciones del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: tiempo de implementación estimado e impacto operativo para {{CLIENT_NAME}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye cronograma y riesgos. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteIntegracionesApisIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptIntegracionesApisAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptIntegracionesApisStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptIntegracionesApisExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptIntegracionesApisOptimization(
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

export function promptIntegracionesApisQa(
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

export function promptIntegracionesApisReport(
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
