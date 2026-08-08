import { describe, it, expect } from "vitest";
import { classifyStrategyIntent, intentPromptMode } from "../../local-ai/specialization/StrategyIntentClassifier";
import { extractVerifiedFacts } from "../../local-ai/specialization/ContextFactExtractor";

describe("StrategyIntentClassifier", () => {
  it("classifies topic cluster as definition + direct mode", () => {
    expect(classifyStrategyIntent("¿Qué es un topic cluster?", "easy")).toBe("definition");
    expect(intentPromptMode("definition")).toBe("direct");
  });

  it("classifies dashboard comparison as comparison", () => {
    expect(classifyStrategyIntent("Dashboard ejecutivo vs operativo.", "easy")).toBe("comparison");
  });

  it("classifies expert scenario as strategic plan", () => {
    expect(
      classifyStrategyIntent(
        "Escenarios de riesgo si el contexto contradice precio premium vs descuento agresivo — prioriza contexto.",
        "expert",
      ),
    ).toBe("strategic_plan");
  });

  it("keeps hard factual SEO as tactical not full plan", () => {
    expect(classifyStrategyIntent("Core Web Vitals impacto ranking.", "hard")).toBe("tactical");
    expect(intentPromptMode("tactical")).toBe("direct");
  });
});

describe("ContextFactExtractor", () => {
  it("extracts ejecutivo/operativo line from analytics KB", () => {
    const facts = extractVerifiedFacts("Dashboard ejecutivo vs operativo.", [
      {
        sourceId: "kb:analytics:saas_analytics_tech.md",
        documentId: "d1",
        chunkIndex: 0,
        content:
          "## Analítica\nDashboards: ejecutivo (ingresos, churn) vs operativo (campañas, pipeline).\nCalidad de datos.",
        score: 0.8,
      },
    ]);
    expect(facts.length).toBeGreaterThan(0);
    expect(facts[0]!.text.toLowerCase()).toMatch(/ejecutivo/);
  });
});
