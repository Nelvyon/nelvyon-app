export type StrategyIntent = "definition" | "comparison" | "tactical" | "strategic_plan";

function norm(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[¿?¡!.\s]+/, "");
}

/** Deterministic intent — no ML router. Drives prompt shape, not model selection. */
export function classifyStrategyIntent(
  query: string,
  difficulty?: string,
): StrategyIntent {
  const q = norm(query);

  if (/plan |roadmap|escenarios|hipotesis|90 dias|prioridades|cro landing|atribucion multi|testable|contingencia/.test(q)) {
    return "strategic_plan";
  }
  if (/^(que es|define|definicion)/.test(q)) return "definition";
  if (/\bvs\b| versus |diferencia |frente a |compar/.test(q)) return "comparison";
  if (
    (difficulty === "expert" || difficulty === "hard") &&
    /plan|estrategia|escenario|hipotesis|testable|prioriz/.test(q)
  ) {
    return "strategic_plan";
  }
  return "tactical";
}

export function intentPromptMode(intent: StrategyIntent): "direct" | "full_plan" {
  return intent === "strategic_plan" ? "full_plan" : "direct";
}
