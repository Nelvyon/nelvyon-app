import type { KnowledgeDomainId } from "./ontology";
import { buildFullBenchmarkCatalog, BENCHMARK_CATALOG_STATS } from "./benchmarkCaseCatalog";

export type BenchmarkDifficulty = "easy" | "medium" | "hard" | "expert" | "adversarial";
export type BenchmarkSplit = "dev" | "eval";
export type GateCategory =
  | "nelvyon"
  | "compliance"
  | "planning"
  | "strategy"
  | "json"
  | "rag"
  | "adversarial"
  | "citations";

export type BenchmarkCase = {
  id: string;
  domain: KnowledgeDomainId;
  difficulty: BenchmarkDifficulty;
  split: BenchmarkSplit;
  gateCategory: GateCategory;
  query: string;
  expectKeywords?: string[];
  expectKeywordRatio?: number;
  requireJson?: boolean;
  requirePlan?: boolean;
  requireCitations?: boolean;
  forbiddenInResponse?: RegExp[];
  ragProbe?: string;
  minRagScore?: number;
};

/** 200 cases — 10 per domain × 20 domains. Eval frozen for gates. */
function enrichBenchmarkCases(cases: BenchmarkCase[]): BenchmarkCase[] {
  return cases.map((c) => {
    // Eval slot 02: mandatory citations gate (except json/plan/rag/adversarial)
    if (
      c.split === "eval" &&
      c.id.endsWith("-02") &&
      !c.requireJson &&
      !c.requirePlan &&
      !c.ragProbe &&
      c.gateCategory !== "adversarial"
    ) {
      return { ...c, requireCitations: true, gateCategory: "citations" as const };
    }
    // Eval slot 01 nelvyon/saas/tech: also require citations
    if (
      c.split === "eval" &&
      c.id.endsWith("-01") &&
      (c.gateCategory === "nelvyon" || c.domain === "saas" || c.domain === "development_tech")
    ) {
      return { ...c, requireCitations: true };
    }
    return c;
  });
}

export const SPECIALIZATION_BENCHMARK: BenchmarkCase[] = enrichBenchmarkCases(buildFullBenchmarkCatalog());

export { BENCHMARK_CATALOG_STATS };

export function casesBySplit(split: BenchmarkSplit): BenchmarkCase[] {
  return SPECIALIZATION_BENCHMARK.filter((c) => c.split === split);
}

export function casesByDomain(domain: KnowledgeDomainId): BenchmarkCase[] {
  return SPECIALIZATION_BENCHMARK.filter((c) => c.domain === domain);
}

export function casesByGate(gate: GateCategory, split: BenchmarkSplit = "eval"): BenchmarkCase[] {
  return SPECIALIZATION_BENCHMARK.filter((c) => c.gateCategory === gate && c.split === split);
}

export function benchmarkStats(): typeof BENCHMARK_CATALOG_STATS & { evalCount: number; devCount: number } {
  return {
    ...BENCHMARK_CATALOG_STATS,
    evalCount: casesBySplit("eval").length,
    devCount: casesBySplit("dev").length,
  };
}
