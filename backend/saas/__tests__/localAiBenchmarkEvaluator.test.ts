import { describe, it, expect } from "vitest";
import { evaluateRetrieval, evaluateResponse, evaluateJsonToolCase } from "../../local-ai/specialization/BenchmarkEvaluator";
import type { BenchmarkCase } from "../../local-ai/specialization/benchmarkSuite";
import type { RagRetrievalResult } from "../../local-ai/LocalRagRetriever";
import { parseToolJson, extractJsonObject, scoreToolJson } from "../../local-ai/specialization/JsonOutputService";
import { validatePlanSections } from "../../local-ai/specialization/PlanTemplate";

function mockRetrieval(overrides: Partial<RagRetrievalResult> & { probeContent?: string }): RagRetrievalResult {
  const content = overrides.probeContent ?? "NELVYON-RAG-SMOKE-2026 en corpus";
  return {
    query: "test",
    expandedQuery: "test",
    citations: overrides.citations ?? [
      { sourceId: "kb:platform", documentId: "d1", chunkIndex: 0, content, score: 0.68 },
    ],
    contextBlock: `[1] (kb:platform, score=0.680)\n${content}`,
    confidence: 0.7,
    topK: 4,
    effectiveMinScore: 0.32,
    activeChunkCount: 100,
    ...overrides,
  };
}

describe("BenchmarkEvaluator — retrieval vs response separation", () => {
  const ragCase: BenchmarkCase = {
    id: "rag-test",
    domain: "nelvyon",
    difficulty: "medium",
    split: "eval",
    gateCategory: "rag",
    query: "código RAG",
    ragProbe: "NELVYON-RAG-SMOKE-2026",
    minRagScore: 0.4,
  };

  it("scores retrieval PASS when probe is in citations even if LLM answer is wrong", () => {
    const retrieval = mockRetrieval({});
    const ret = evaluateRetrieval(ragCase, retrieval);
    expect(ret.probeFound).toBe(true);
    expect(ret.score).toBeGreaterThan(0.8);

    const resp = evaluateResponse(ragCase, "SQLite en puerto 3306");
    expect(resp.score).toBeLessThan(1);
  });

  it("scores retrieval FAIL when probe missing from corpus", () => {
    const retrieval = mockRetrieval({ citations: [], contextBlock: "", probeContent: "" });
    const ret = evaluateRetrieval(ragCase, { ...retrieval, citations: [], contextBlock: "", confidence: 0 });
    expect(ret.score).toBe(0);
    expect(ret.violations).toContain("no_citations_retrieved");
  });
});

describe("JsonOutputService", () => {
  it("parses JSON with markdown fences", () => {
    const raw = '```json\n{"tool":"create_campaign","args":{"name":"Lanzamiento Q3","budget_eur":2500,"channels":["email","linkedin"]}}\n```';
    const p = parseToolJson(raw);
    expect(p.ok).toBe(true);
    expect(p.value?.args.name).toBe("Lanzamiento Q3");
  });

  it("scores tool JSON against expected args", () => {
    const json = '{"tool":"create_campaign","args":{"name":"Lanzamiento Q3","budget_eur":2500,"channels":["email","linkedin"]}}';
    const expected = { name: "Lanzamiento Q3", budget_eur: 2500, channels: ["email", "linkedin"] };
    expect(scoreToolJson(json, expected)).toBeGreaterThan(0.99);
    expect(evaluateJsonToolCase(json).score).toBeGreaterThan(0.99);
  });

  it("extracts JSON from prose wrapper", () => {
    const e = extractJsonObject('Aquí está: {"tool":"create_campaign","args":{"name":"X","budget_eur":1,"channels":[]}} fin');
    expect(e.startsWith("{")).toBe(true);
  });
});

describe("PlanTemplate", () => {
  it("requires 16 sections", () => {
    const text = `
      objetivo contexto diagnóstico hipótesis prioridades fases dependencias
      riesgos recursos calendario métricas criterios de aceptación escenarios
      contingencia fuentes confianza
    `;
    const v = validatePlanSections(text);
    expect(v.found.length).toBe(16);
    expect(v.ok).toBe(true);
  });
});

describe("Response scoring — no false positive compliance", () => {
  it("penalizes refusal when context expected", () => {
    const c: BenchmarkCase = {
      id: "x",
      domain: "email_marketing",
      difficulty: "medium",
      split: "eval",
      gateCategory: "strategy",
      query: "SPF DKIM",
      expectKeywords: ["spf", "dkim"],
      expectKeywordRatio: 0.5,
    };
    const r = evaluateResponse(c, "No tengo suficiente información sobre SPF.");
    expect(r.violations).toContain("refusal_with_context_expected");
  });
});
