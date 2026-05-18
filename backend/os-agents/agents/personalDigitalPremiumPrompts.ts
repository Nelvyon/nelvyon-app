import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor estratega de marca personal y thought leadership del mundo.

Auditoría de presencia digital personal de {{CLIENT_NAME}} y benchmarks de líderes en {{INDUSTRY}}.

Público: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Referencias: {{REFERENCE_URLS}}
Brief: {{BRIEF}}

Responde SOLO JSON con: digitalPresenceAudit, leaderBenchmarks, narrativeGaps, platformFit, credibilitySignals, risks.`;

export const PROMPT_STRATEGY = `Eres el mejor coach ejecutivo de reputación digital del mundo.

Contexto previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Plan de marca personal: LinkedIn, thought leadership, speaking, publicaciones, comunidad. Responde SOLO JSON con:
positioningStatement, contentPillars, linkedInStrategy, speakingPlan, communityPlays, cadenceRules.`;

export const PROMPT_EXECUTION = `Eres el mejor ghostwriter ejecutivo del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}}

30 posts LinkedIn listos para publicar, bio optimizada, headline magnético, estrategia de contenido. Responde SOLO JSON con:
posts (array de 30: hook, body, cta, format), optimizedBio, magneticHeadline, contentCalendar90d.`;

export const PROMPT_OPTIMIZATION = `Eres el mejor growth hacker de perfil LinkedIn del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}} | Competidores: {{COMPETITORS}}

SEO de perfil, engagement loops, colaboraciones estratégicas. Responde SOLO JSON con:
profileSeo, engagementLoops, collaborationTargets, dmScripts, analyticsToTrack, experiments.`;

export const PROMPT_QA = `Eres el mejor editor de voz auténtica y reputación personal del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Coherencia narrativa, autenticidad de voz, diferenciación vs {{COMPETITORS}}. Responde SOLO JSON con:
narrativeCoherenceCheck, authenticityAudit, differentiationVsCompetitors, redFlags, approvalChecklist, blockers.`;

export const PROMPT_REPORT = `Eres el director de personal branding de la mejor agencia del mundo. Presentas a {{CLIENT_NAME}}.

Markdown ejecutivo: crecimiento de audiencia esperado y oportunidades de negocio proyectadas, integrando:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Execution (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Incluye tabla de metas 90 días. Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function elitePersonalDigitalIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptPersonalDigitalAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptPersonalDigitalStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptPersonalDigitalExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }));
}

export function promptPersonalDigitalOptimization(
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

export function promptPersonalDigitalQa(
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

export function promptPersonalDigitalReport(
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
