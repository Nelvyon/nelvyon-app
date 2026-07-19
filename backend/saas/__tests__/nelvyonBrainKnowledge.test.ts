/**
 * NELVYON brain — knowledge coverage, gaps, Nelvyon-first context.
 */

import { describe, expect, it } from "vitest";
import {
  buildKnowledgeManifest,
  auditManifest,
  relativeManifestPath,
} from "../../local-ai/specialization/knowledgeManifest";
import { detectKnowledgeGaps } from "../../local-ai/knowledgeGapDetector";
import {
  assertNoIndiscriminateIngest,
  listApprovedExternalKnowledge,
} from "../../local-ai/externalKnowledgeRegistry";
import { buildAgentContext } from "../../private-ai/context/AgentContextEngine";

describe("NELVYON brain knowledge", () => {
  it("indexes critical living docs in manifest", () => {
    const m = buildKnowledgeManifest();
    const rels = new Set(m.map((e) => relativeManifestPath(e.path)));
    for (const p of [
      "docs/DECISIONS.md",
      "docs/CHANGELOG.md",
      "docs/AGENT_WORKFLOW_CATALOG.md",
      "docs/AUTONOMOUS_WORKFORCE_CERT.md",
      "docs/FINAL_ELITE_CLOSURE.md",
    ]) {
      expect(rels.has(p), p).toBe(true);
    }
  });

  it("gap detector never claims complete knowledge", () => {
    const g = detectKnowledgeGaps();
    expect(g.claimComplete).toBe(false);
    expect(g.coverageRatioEstimate).toBeGreaterThan(0);
    expect(g.coverageRatioEstimate).toBeLessThanOrEqual(1);
    expect(g.proposals.length).toBeGreaterThan(0);
  });

  it("audit scans top-level docs orphans", () => {
    const a = auditManifest();
    expect(a.totalEntries).toBeGreaterThan(50);
    expect(Array.isArray(a.orphanCandidates)).toBe(true);
  });

  it("external registry is deny-by-default for bulk ingest", () => {
    expect(assertNoIndiscriminateIngest().ok).toBe(true);
    expect(listApprovedExternalKnowledge().length).toBeGreaterThan(0);
  });

  it("agent context is Nelvyon-first and marks grounded=false without RAG", async () => {
    const rag = {
      searchPlatform: async () => ({ chunks: [], query: "", source: "platform" as const }),
      countPlatform: async () => 0,
    };
    const ctx = await buildAgentContext({
      tenantId: "t1",
      userId: "u1",
      agentId: "seo",
      query: "¿Cuál es la arquitectura de NELVYON?",
      roles: ["member"],
      allowedTools: ["rag.search", "memory.read"],
      rag,
    });
    expect(ctx.meta.nelvyonFirst).toBe(true);
    expect(ctx.meta.grounded).toBe(false);
    expect(ctx.systemSuffix).toMatch(/Prioriza documentación interna/i);
  });
});
