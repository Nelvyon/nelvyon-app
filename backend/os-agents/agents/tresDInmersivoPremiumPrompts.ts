import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

export const PROMPT_ANALYSIS = `Eres el mejor director de experiencias 3D e inmersivas del mundo. Has liderado AR para IKEA y WebXR para marcas de lujo.

Viabilidad 3D para {{INDUSTRY}}: casos de uso AR/VR/3D web.

Cliente: {{CLIENT_NAME}}
Audiencia: {{TARGET_AUDIENCE}}
Tono: {{TONE}}
Competidores: {{COMPETITORS}}
Colores: {{PRIMARY_COLOR}} / {{SECONDARY_COLOR}}
Brief: {{BRIEF}}

Responde SOLO JSON con: useCases, platformFit, competitor3dCodes, feasibilityScore, risks.`;

export const PROMPT_STRATEGY = `Eres el mejor CTO creativo 3D del mundo.

Contexto:
{{STEP1_RESULT}}

{{CLIENT_NAME}} | {{INDUSTRY}}

Roadmap de activos 3D: formatos glTF, USDZ, WebGL, casos de uso. Responde SOLO JSON con:
assetRoadmap, formats, pipelines, teamRoles, milestones.`;

export const PROMPT_EXECUTION = `Eres el mejor technical artist del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}

{{CLIENT_NAME}}

Especificaciones técnicas de 5 escenas/activos 3D. Responde SOLO JSON con:
scenes (array de 5: name, polyBudget, materials, lighting, interactions).`;

export const PROMPT_OPTIMIZATION = `Eres el mejor optimizador 3D web del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}

Performance web: poly count, LOD, lazy load, mobile first. Responde SOLO JSON con: lodPlan, lazyLoadStrategy, mobileBudget, compression, fallback2d.`;

export const PROMPT_QA = `Eres el mejor QA de runtime 3D del mundo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Compatibilidad cross-browser, carga <3s, fallbacks. Responde SOLO JSON con: browserMatrix, perfBudget, testPlan, knownIssues.`;

export const PROMPT_REPORT = `Eres el CEO de la mejor agencia 3D del mundo. Presentas a {{CLIENT_NAME}}.

Markdown con impacto en conversión (+40% típico ecommerce) y roadmap de producción:
- Analysis: {{STEP1_RESULT}}
- Strategy: {{STEP2_RESULT}}
- Specs (extracto): {{STEP3_SUMMARY}}
- Optimization (extracto): {{STEP4_SUMMARY}}
- QA: {{STEP5_RESULT}}

Termina con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function prompt3dAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function prompt3dStrategy(s1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1 }));
}

export function prompt3dExecution(s1: string, s2: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_EXECUTION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2 }));
}

export function prompt3dOptimization(s1: string, s2: string, s3: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_OPTIMIZATION, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_RESULT: s3 }));
}

export function prompt3dQa(s1: string, s2: string, s3: string, s4: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_QA, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_RESULT: s3, STEP4_RESULT: s4 }));
}

export function prompt3dReport(payload: OsJobPayload, s1: string, s2: string, s3s: string, s4s: string, s5: string): string {
  return buildPrompt(PROMPT_REPORT, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: s1, STEP2_RESULT: s2, STEP3_SUMMARY: s3s, STEP4_SUMMARY: s4s, STEP5_RESULT: s5 }));
}
