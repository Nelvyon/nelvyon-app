/**
 * Knowledge gap detector — self-evaluation of NELVYON brain coverage.
 * Does not invent completeness; reports orphans and thin domains from evidence.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditManifest,
  buildKnowledgeManifest,
  manifestSummary,
  relativeManifestPath,
} from "./specialization/knowledgeManifest";
import { allDomainIds, type KnowledgeDomainId } from "./specialization/ontology";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export type KnowledgeGapReport = {
  generatedAt: string;
  summary: ReturnType<typeof manifestSummary>;
  domainsCovered: KnowledgeDomainId[];
  domainsThin: Array<{ domain: KnowledgeDomainId; count: number }>;
  orphanDocs: string[];
  criticalLivingDocsMissing: string[];
  proposals: string[];
  coverageRatioEstimate: number;
  claimComplete: false;
};

const CRITICAL_LIVING = [
  "docs/DECISIONS.md",
  "docs/CHANGELOG.md",
  "docs/HANDOVER.md",
  "docs/DATABASE.md",
  "docs/AGENT_WORKFLOW_CATALOG.md",
  "docs/AUTONOMOUS_WORKFORCE_CERT.md",
  "docs/FINAL_ELITE_CLOSURE.md",
  "docs/KNOWN_ISSUES.md",
  "docs/INFRASTRUCTURE.md",
];

export function detectKnowledgeGaps(): KnowledgeGapReport {
  const manifest = buildKnowledgeManifest();
  const summary = manifestSummary(manifest);
  const audit = auditManifest(manifest);
  const indexed = new Set(
    manifest.map((e) => relativeManifestPath(e.path)),
  );

  const criticalLivingDocsMissing = CRITICAL_LIVING.filter((p) => {
    const abs = path.join(REPO, p);
    return fs.existsSync(abs) && !indexed.has(p);
  });

  const domainsThin = allDomainIds()
    .map((domain) => ({ domain, count: summary.byDomain[domain] ?? 0 }))
    .filter((d) => d.count < 2)
    .sort((a, b) => a.count - b.count);

  const proposals: string[] = [];
  if (criticalLivingDocsMissing.length) {
    proposals.push(`Index missing critical living docs: ${criticalLivingDocsMissing.join(", ")}`);
  }
  if (audit.orphanCandidates.length) {
    proposals.push(
      `Review ${audit.orphanCandidates.length} orphan candidates under docs/services|operations|runbooks|docs/*.md`,
    );
  }
  for (const d of domainsThin) {
    proposals.push(`Add knowledge pack or SOP for thin domain «${d.domain}» (count=${d.count})`);
  }
  proposals.push("Run `node scripts/nelvyon-knowledge-sync.mjs` after doc changes (CI on docs/**)");
  proposals.push("When LOCAL_AI DB is up: `pnpm exec tsx scripts/local-ai-ingest-knowledge.ts`");

  // Honest estimate — never 1.0 while orphans remain
  const criticalHit = CRITICAL_LIVING.filter((p) => indexed.has(p)).length;
  const domainFill =
    allDomainIds().filter((d) => (summary.byDomain[d] ?? 0) >= 2).length / allDomainIds().length;
  const orphanPenalty = Math.min(0.25, audit.orphanCandidates.length * 0.002);
  const raw =
    (criticalHit / CRITICAL_LIVING.length) * 0.5 + domainFill * 0.5 - orphanPenalty;
  const coverageRatioEstimate = Math.round(Math.max(0, Math.min(0.99, raw)) * 1000) / 1000;

  return {
    generatedAt: new Date().toISOString(),
    summary,
    domainsCovered: allDomainIds().filter((d) => (summary.byDomain[d] ?? 0) > 0),
    domainsThin,
    orphanDocs: audit.orphanCandidates.slice(0, 80),
    criticalLivingDocsMissing,
    proposals,
    coverageRatioEstimate,
    claimComplete: false,
  };
}
