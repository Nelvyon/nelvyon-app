import type { KnowledgeDomainId } from "./ontology";
import { classifyStrategyIntent, intentPromptMode } from "./StrategyIntentClassifier";
import { strategyExpertIntro } from "./DomainStrategyTemplates";

const FULL_PLAN_SECTIONS = [
  "Diagnóstico",
  "Objetivo",
  "Hipótesis",
  "Prioridades",
  "Fases",
  "Acciones",
  "Dependencias",
  "Riesgos",
  "Métricas permitidas",
  "Criterios de aceptación",
  "Fuentes",
  "Confianza",
] as const;

export function buildStrategySystemExtension(
  query: string,
  domain: KnowledgeDomainId,
  difficulty?: string,
): string {
  const intent = classifyStrategyIntent(query, difficulty);
  const mode = intentPromptMode(intent);
  const intro = strategyExpertIntro(domain);
  const introBlock = intro ? `${intro}\n\n` : "";

  if (mode === "direct") {
    return `${introBlock}MODO RESPUESTA DIRECTA:
- Responde la PREGUNTA de forma concreta en 2-5 párrafos (o listas breves si aplica).
- NO uses plantilla de 12 secciones salvo que la pregunta pida un plan completo.
- Empieza respondiendo la pregunta; cita [N] en cada afirmación factual.
- Prohibido respuestas genéricas de auditoría/plan si la pregunta es definicional o táctica.
- Prohibido "no tengo información" si hay HECHOS VERIFICADOS o FUENTES AUTORIZADAS.`;
  }

  const sections = FULL_PLAN_SECTIONS.map((s) => `- ${s}`).join("\n");
  return `${introBlock}MODO PLAN ESTRATÉGICO:
Responde con encabezados ##:
${sections}

Reglas:
- Cada afirmación factual lleva cita [N].
- Confianza: número 0-1 al final.`;
}
