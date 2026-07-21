/**
 * NELVYON brain — knowledge coverage, gaps, Nelvyon-first context, agent domains.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import {
  AGENT_KNOWLEDGE_DOMAINS,
  primaryDomainHint,
} from "../../local-ai/specialization/agentKnowledgeDomains";
import {
  indexClassifications,
  archiveClassifications,
} from "../../local-ai/specialization/orphanClassification";
import { listPrivateAgents } from "../../private-ai/nelvyonAgentRegistry";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const INGEST_EVIDENCE = path.join(
  REPO,
  "backend/local-ai/benchmarks/knowledge_ingest_evidence.json",
);

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
      "docs/NELVYON_BRAIN_KNOWLEDGE.md",
      "docs/OPS.md",
      "docs/PHASE2_SHARED_MEMORY.md",
      "docs/PHASE2_MCP.md",
    ]) {
      expect(rels.has(p), p).toBe(true);
    }
  });

  it("gap detector never claims complete; verified mirrors ingest evidence artifact", () => {
    const g = detectKnowledgeGaps();
    // Typed contract: claimComplete is always literal false (never invent completeness).
    expect(g.claimComplete).toBe(false);
    expect(g.coverageRatioEstimate).toBeGreaterThan(0);
    expect(g.coverageRatioEstimate).toBeLessThanOrEqual(0.99);
    expect(g.proposals.length).toBeGreaterThan(0);
    expect(g.domainCoverage.length).toBeGreaterThan(10);
    expect(g.unclassifiedActiveDocs.length).toBeLessThanOrEqual(5);

    // verified mirrors knowledge_ingest_evidence.json (ok && verified) — not a hardcoded false.
    expect(g.ingestEvidence.artifactExists).toBe(true);
    expect(fs.existsSync(INGEST_EVIDENCE)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(INGEST_EVIDENCE, "utf8")) as {
      ok?: boolean;
      verified?: boolean;
    };
    const expectedVerified = Boolean(raw.verified && raw.ok);
    expect(g.ingestEvidence.verified).toBe(expectedVerified);
    // Bloque 1 (2026-07-20+): evidence must stay verified with claimComplete still false.
    expect(expectedVerified).toBe(true);
  });

  it("classifies orphans into index or archive", () => {
    expect(indexClassifications().length).toBeGreaterThan(50);
    expect(archiveClassifications().length).toBeGreaterThan(70);
  });

  it("all private agents have rag.search and domain map", () => {
    const agents = listPrivateAgents();
    for (const a of agents) {
      expect(a.allowedTools.includes("rag.search"), `${a.id} needs rag.search`).toBe(true);
      expect(AGENT_KNOWLEDGE_DOMAINS[a.id], `${a.id} domain map`).toBeTruthy();
    }
    expect(primaryDomainHint("seo")).toBe("seo");
    expect(primaryDomainHint("google_ads")).toBe("paid_ads");
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

  it("agent context is Nelvyon-first, passes domain, grounded=false without RAG", async () => {
    const calls: unknown[] = [];
    const rag = {
      searchPlatform: async (q: string, opts?: number | { limit?: number; domain?: string }) => {
        calls.push({ q, opts });
        return { chunks: [], query: q, source: "platform" as const };
      },
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
    expect(ctx.meta.domainHint).toBe("seo");
    expect(ctx.systemSuffix).toMatch(/Prioriza documentación interna/i);
    expect(calls[0]).toMatchObject({ opts: { domain: "seo" } });
  });
});
