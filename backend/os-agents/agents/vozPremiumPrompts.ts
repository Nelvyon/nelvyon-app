import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor estratega de audio branding y podcasting del mundo.

Auditoría de presencia en audio de {{CLIENT_NAME}}: podcasts, audio ads, voice search en {{INDUSTRY}}.

Público: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores marca: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: audioPresenceAudit, podcastLandscape, voiceSearchOpportunities, gaps, competitorAudioBenchmarks, risks.`;

export const PROMPT_STRATEGY = `Eres el mejor productor ejecutivo de audio del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Roadmap de voz: podcast corporativo, audio branding, Alexa/Google skills. Responde SOLO JSON con:
roadmapPhases, podcastConcept, audioBrandingPillars, voiceAssistantUseCases, distributionPlan, budgetBands.`;

export const PROMPT_EXECUTION = `Eres el mejor guionista de audio y copy de spots del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Audiencia: {{TARGET_AUDIENCE}}

Guión piloto podcast (10 episodios), scripts audio ads, brief identidad sonora. Responde SOLO JSON con:
episodes (array de 10: title, hook, outline, cta), audioAdScripts, sonicIdentityBrief, hostGuidelines.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor especialista en discoverability de audio del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

SEO de voz, transcripciones, distribución multi-plataforma. Responde SOLO JSON con:
voiceSeoTactics, transcriptionWorkflow, rssMetadata, clipStrategy, syndicationChecklist, analyticsTags.`;

export const PROMPT_QA = `Eres el mejor ingeniero de masterización y calidad de audio del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Calidad 44.1kHz, loudness -16 LUFS (objetivo), branding sonoro consistente. Responde SOLO JSON con:
technicalSpec, loudnessTargets, qcChecklist, brandConsistencyAudio, blockers, deliveryFormats.`;

export const PROMPT_REPORT = `Eres el director de audio de la mejor productora del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: alcance proyectado en plataformas de audio para {{TARGET_AUDIENCE}}, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla de KPIs audio. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteVozIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptVozAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptVozStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptVozExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptVozOptimization(step1: string, step2: string, step3: string, payload: OsJobPayload): string {
  return buildPrompt(
    PROMPT_OPTIMIZATION,
    merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2, STEP3_RESULT: step3 }),
  );
}

export function promptVozQa(
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

export function promptVozReport(
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
