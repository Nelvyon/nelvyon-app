import { describe, it, expect } from "vitest";
import { buildKnowledgeManifest, manifestSummary } from "../../local-ai/specialization/knowledgeManifest";
import { NELVYON_ONTOLOGY, allDomainIds } from "../../local-ai/specialization/ontology";
import { CONSTITUTION_RULES } from "../../local-ai/specialization/constitution";
import { SPECIALIZATION_BENCHMARK } from "../../local-ai/specialization/benchmarkSuite";
import { validateNoForbiddenPhrases, validateJsonOutput, validatePlanStructure } from "../../local-ai/specialization/ResponseValidator";
import { evaluateCaseScore, aggregateGateResults } from "../../local-ai/specialization/QualityGates";

describe("NELVYON specialization infrastructure", () => {
  it("ontology covers 20 domains", () => {
    expect(allDomainIds().length).toBeGreaterThanOrEqual(18);
  });

  it("knowledge manifest has authorized sources", () => {
    const m = buildKnowledgeManifest();
    expect(m.length).toBeGreaterThan(50);
    expect(manifestSummary(m).total).toBe(m.length);
  });

  it("benchmark suite has adversarial and RAG cases", () => {
    expect(SPECIALIZATION_BENCHMARK.some((c) => c.difficulty === "adversarial")).toBe(true);
    expect(SPECIALIZATION_BENCHMARK.some((c) => c.ragProbe)).toBe(true);
  });

  it("validators reject forbidden phrases", () => {
    const r = validateNoForbiddenPhrases("ROI garantizado +300%");
    expect(r.ok).toBe(false);
  });

  it("validators accept valid JSON", () => {
    const r = validateJsonOutput('{"tool":"create_campaign","args":{"name":"Q3"}}');
    expect(r.ok).toBe(true);
  });

  it("plan structure validator detects missing sections", () => {
    const r = validatePlanStructure("solo un párrafo sin estructura");
    expect(r.ok).toBe(false);
    expect(CONSTITUTION_RULES.requiredPlanSections.length).toBe(16);
  });

  it("quality gates aggregate infrastructure scores", () => {
    const report = aggregateGateResults(
      { nelvyon: 0.5, compliance: 1, planning: 0.2, strategy: 0.4, json: 0, citations: 0.3, rag: 0.5 },
      { tenant_isolation: 1, secrets_leaked: 0, cross_client_leak: 0, hallucinations: 0, injection_blocked: 1, adversarial: 0.5, offline: 1, restart: 1 },
    );
    expect(report.gates.length).toBeGreaterThan(10);
    expect(report.specializationComplete).toBe(false);
  });

  it("constitution thresholds are strict", () => {
    expect(CONSTITUTION_RULES.qualityGateThresholds.nelvyon_knowledge).toBe(0.95);
    expect(CONSTITUTION_RULES.qualityGateThresholds.tenant_isolation).toBe(1);
  });
});
