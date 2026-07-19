/**
 * Knowledge gap detector — self-evaluation of NELVYON brain coverage.
 * Does not invent completeness; reports orphans, thin domains, broken links, ingest status.
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
import {
  AGENT_KNOWLEDGE_DOMAINS,
  AGENTS_REQUIRING_RAG,
} from "./specialization/agentKnowledgeDomains";
import {
  archiveClassifications,
  classifiedPaths,
  indexClassifications,
} from "./specialization/orphanClassification";
import { listPrivateAgents } from "../private-ai/nelvyonAgentRegistry";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export type DomainCoverageRow = {
  domain: KnowledgeDomainId;
  documents: number;
  percentOfManifest: number;
  status: "ok" | "thin" | "empty";
  priority: "P0" | "P1" | "P2";
  gaps: string[];
};

export type KnowledgeGapReport = {
  generatedAt: string;
  summary: ReturnType<typeof manifestSummary>;
  domainsCovered: KnowledgeDomainId[];
  domainsThin: Array<{ domain: KnowledgeDomainId; count: number }>;
  domainCoverage: DomainCoverageRow[];
  orphanDocs: string[];
  unclassifiedActiveDocs: string[];
  archivedCount: number;
  archivedPaths: string[];
  criticalLivingDocsMissing: string[];
  brokenInternalLinks: Array<{ file: string; link: string }>;
  duplicateBasenames: string[];
  agentsWithoutRag: string[];
  agentsMissingDomainMap: string[];
  ingestEvidence: {
    artifactExists: boolean;
    artifactPath: string;
    verified: boolean;
    blocker?: string;
  };
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
  "docs/NELVYON_BRAIN_KNOWLEDGE.md",
];

const INGEST_EVIDENCE = "backend/local-ai/benchmarks/knowledge_ingest_evidence.json";

function scanBrokenLinks(indexedRels: Set<string>): Array<{ file: string; link: string }> {
  const broken: Array<{ file: string; link: string }> = [];
  const sample = [...indexedRels].filter((p) => p.startsWith("docs/") && p.endsWith(".md")).slice(0, 40);
  for (const rel of sample) {
    const abs = path.join(REPO, rel);
    if (!fs.existsSync(abs)) continue;
    let text: string;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const re = /\[([^\]]*)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const link = m[2].trim();
      if (!link.startsWith("docs/") && !link.startsWith("./") && !link.startsWith("../")) continue;
      if (link.startsWith("http") || link.startsWith("#") || link.startsWith("mailto:")) continue;
      const base = path.dirname(rel);
      const target = path.normalize(path.join(base, link.split("#")[0])).replace(/\\/g, "/");
      const candidates = [target, link.replace(/^\.\//, "docs/")];
      const ok = candidates.some((c) => fs.existsSync(path.join(REPO, c)));
      if (!ok && link.includes(".md")) {
        broken.push({ file: rel, link });
        if (broken.length >= 25) return broken;
      }
    }
  }
  return broken;
}

function duplicateBasenames(manifest: ReturnType<typeof buildKnowledgeManifest>): string[] {
  const byBase = new Map<string, Set<string>>();
  for (const e of manifest) {
    const rel = relativeManifestPath(e.path);
    const base = path.basename(rel).toLowerCase();
    if (!byBase.has(base)) byBase.set(base, new Set());
    byBase.get(base)!.add(rel);
  }
  return [...byBase.entries()]
    .filter(([, paths]) => paths.size > 1)
    .map(([base, paths]) => `${base} → ${[...paths].join(", ")}`)
    .slice(0, 20);
}

function readIngestEvidence(): KnowledgeGapReport["ingestEvidence"] {
  const artifactPath = INGEST_EVIDENCE;
  const abs = path.join(REPO, artifactPath);
  if (!fs.existsSync(abs)) {
    return {
      artifactExists: false,
      artifactPath,
      verified: false,
      blocker: "No knowledge_ingest_evidence.json — run ingest when local-ai Postgres is up",
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as {
      verified?: boolean;
      ok?: boolean;
      blocker?: string;
    };
    return {
      artifactExists: true,
      artifactPath,
      verified: Boolean(raw.verified && raw.ok),
      blocker: raw.blocker,
    };
  } catch {
    return {
      artifactExists: true,
      artifactPath,
      verified: false,
      blocker: "Invalid ingest evidence JSON",
    };
  }
}

export function detectKnowledgeGaps(): KnowledgeGapReport {
  const manifest = buildKnowledgeManifest();
  const summary = manifestSummary(manifest);
  const audit = auditManifest(manifest);
  const indexed = new Set(manifest.map((e) => relativeManifestPath(e.path)));

  const criticalLivingDocsMissing = CRITICAL_LIVING.filter((p) => {
    const abs = path.join(REPO, p);
    return fs.existsSync(abs) && !indexed.has(p);
  });

  const domainsThin = allDomainIds()
    .map((domain) => ({ domain, count: summary.byDomain[domain] ?? 0 }))
    .filter((d) => d.count < 2)
    .sort((a, b) => a.count - b.count);

  const totalEntries = Math.max(1, summary.total);
  const domainCoverage: DomainCoverageRow[] = allDomainIds().map((domain) => {
    const documents = summary.byDomain[domain] ?? 0;
    const percentOfManifest = Math.round((documents / totalEntries) * 1000) / 10;
    const status: DomainCoverageRow["status"] =
      documents === 0 ? "empty" : documents < 2 ? "thin" : "ok";
    const priority: DomainCoverageRow["priority"] =
      status === "empty" ? "P0" : status === "thin" ? "P1" : "P2";
    const gaps: string[] = [];
    if (status === "empty") gaps.push("Sin fuentes en manifiesto");
    if (status === "thin") gaps.push("Menos de 2 fuentes");
    return { domain, documents, percentOfManifest, status, priority, gaps };
  });

  const classified = classifiedPaths();
  const unclassifiedActiveDocs = audit.orphanCandidates.filter((p) => !classified.has(p));
  const archived = archiveClassifications();
  const archivedPaths = archived.map((a) => a.path.replace("docs/", "docs/archive/"));

  const agents = listPrivateAgents();
  const agentsWithoutRag = AGENTS_REQUIRING_RAG.filter((id) => {
    const a = agents.find((x) => x.id === id);
    return !a || !a.allowedTools.includes("rag.search");
  });
  const agentsMissingDomainMap = agents
    .map((a) => a.id)
    .filter((id) => !(id in AGENT_KNOWLEDGE_DOMAINS));

  const brokenInternalLinks = scanBrokenLinks(indexed);
  const dups = duplicateBasenames(manifest);
  const ingestEvidence = readIngestEvidence();

  const proposals: string[] = [];
  if (criticalLivingDocsMissing.length) {
    proposals.push(`Index missing critical living docs: ${criticalLivingDocsMissing.join(", ")}`);
  }
  if (unclassifiedActiveDocs.length) {
    proposals.push(
      `Classify ${unclassifiedActiveDocs.length} remaining top-level/service orphans (index or archive)`,
    );
  }
  for (const d of domainsThin) {
    proposals.push(`Add knowledge pack or SOP for thin domain «${d.domain}» (count=${d.count})`);
  }
  if (agentsWithoutRag.length) {
    proposals.push(`Add rag.search to agents: ${agentsWithoutRag.join(", ")}`);
  }
  if (!ingestEvidence.verified) {
    proposals.push(
      ingestEvidence.blocker ??
        "Verify ingest live: start local-ai Postgres + NELVYON_KNOWLEDGE_INGEST=1",
    );
  }
  if (brokenInternalLinks.length) {
    proposals.push(`Fix ${brokenInternalLinks.length} broken internal markdown links (sample)`);
  }
  proposals.push("Run `node scripts/nelvyon-knowledge-sync.mjs` after doc changes (CI on docs/**)");

  const criticalHit = CRITICAL_LIVING.filter((p) => indexed.has(p)).length;
  const domainFill =
    allDomainIds().filter((d) => (summary.byDomain[d] ?? 0) >= 2).length / allDomainIds().length;
  const orphanPenalty = Math.min(0.2, unclassifiedActiveDocs.length * 0.004);
  const ingestPenalty = ingestEvidence.verified ? 0 : 0.05;
  const raw =
    (criticalHit / CRITICAL_LIVING.length) * 0.45 +
    domainFill * 0.45 +
    (unclassifiedActiveDocs.length === 0 ? 0.1 : 0) -
    orphanPenalty -
    ingestPenalty;
  const coverageRatioEstimate = Math.round(Math.max(0, Math.min(0.99, raw)) * 1000) / 1000;

  return {
    generatedAt: new Date().toISOString(),
    summary,
    domainsCovered: allDomainIds().filter((d) => (summary.byDomain[d] ?? 0) > 0),
    domainsThin,
    domainCoverage,
    orphanDocs: unclassifiedActiveDocs,
    unclassifiedActiveDocs,
    archivedCount: archived.length,
    archivedPaths,
    criticalLivingDocsMissing,
    brokenInternalLinks,
    duplicateBasenames: dups,
    agentsWithoutRag,
    agentsMissingDomainMap,
    ingestEvidence,
    proposals,
    coverageRatioEstimate,
    claimComplete: false,
  };
}
