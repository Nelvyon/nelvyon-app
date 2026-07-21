#!/usr/bin/env node
/**
 * NELVYON brain knowledge sync — rebuild portable manifest + gap report.
 * Optional ingest when LOCAL_AI DB is available (does not fail CI if DB down).
 *
 *   node scripts/nelvyon-knowledge-sync.mjs
 *   NELVYON_KNOWLEDGE_INGEST=1 node scripts/nelvyon-knowledge-sync.mjs
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "backend", "local-ai", "knowledge");
const benchmarks = join(root, "backend", "local-ai", "benchmarks");
mkdirSync(outDir, { recursive: true });
mkdirSync(benchmarks, { recursive: true });

function run(cmd, args, env = {}) {
  return spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...env },
  });
}

// Rebuild manifest + gap report via tsx (no DB required for audit)
const auditScript = "import { writeFileSync } from \"node:fs\";\nimport { join } from \"node:path\";\nimport { fileURLToPath } from \"node:url\";\nimport { buildKnowledgeManifest, manifestSummary, relativeManifestPath, auditManifest } from \"../backend/local-ai/specialization/knowledgeManifest.ts\";\nimport { NELVYON_ONTOLOGY } from \"../backend/local-ai/specialization/ontology.ts\";\nimport { detectKnowledgeGaps } from \"../backend/local-ai/knowledgeGapDetector.ts\";\nimport { assertNoIndiscriminateIngest, listApprovedExternalKnowledge } from \"../backend/local-ai/externalKnowledgeRegistry.ts\";\n\nconst root = join(fileURLToPath(new URL(\".\", import.meta.url)), \"..\");\nprocess.chdir(root);\n\nconst manifest = buildKnowledgeManifest();\nconst portable = manifest.map((e) => ({\n  ...e,\n  path: relativeManifestPath(e.path),\n}));\nconst summary = manifestSummary(manifest);\nconst gaps = detectKnowledgeGaps();\nconst audit = auditManifest(manifest);\nconst external = { policy: assertNoIndiscriminateIngest(), approved: listApprovedExternalKnowledge() };\n\nwriteFileSync(join(root, \"backend/local-ai/knowledge\", \"ontology.json\"), JSON.stringify(NELVYON_ONTOLOGY, null, 2));\nwriteFileSync(\n  join(root, \"backend/local-ai/knowledge\", \"manifest.json\"),\n  JSON.stringify({ generated: new Date().toISOString(), entries: portable, summary }, null, 2),\n);\nwriteFileSync(\n  join(root, \"backend/local-ai/benchmarks\", \"knowledge_gap_report.json\"),\n  JSON.stringify(gaps, null, 2),\n);\nwriteFileSync(\n  join(root, \"backend/local-ai/benchmarks\", \"knowledge_audit.json\"),\n  JSON.stringify({ generatedAt: new Date().toISOString(), audit, external }, null, 2),\n);\nconsole.log(JSON.stringify({ ok: true, total: summary.total, uniqueFiles: summary.uniqueFiles, orphans: gaps.orphanDocs.length, coverageRatioEstimate: gaps.coverageRatioEstimate, claimComplete: false }, null, 2));\n";

const tmp = join(root, "scripts", "_knowledge-sync-run.mts");
writeFileSync(tmp, auditScript);
const r = run("pnpm", ["-C", "apps/web", "exec", "tsx", tmp]);
console.log(r.stdout || "");
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  try { unlinkSync(tmp); } catch { /* ignore */ }
  process.exit(r.status ?? 1);
}
try { unlinkSync(tmp); } catch { /* ignore */ }

if (process.env.NELVYON_KNOWLEDGE_INGEST === "1") {
  // Dedicated tsconfig: apps/web paths must not map `pg` → @types/pg (esbuild TransformError)
  // nor strip @types (tsc TS7016). See ADR-030.
  const ingest = run("pnpm", [
    "-C",
    "apps/web",
    "exec",
    "tsx",
    "--tsconfig",
    "../../scripts/tsconfig.local-ai-ingest.json",
    "../../scripts/local-ai-ingest-knowledge.ts",
  ]);
  console.log(ingest.stdout || "");
  if (ingest.status !== 0) {
    console.warn("[nelvyon-knowledge-sync] ingest failed (DB may be down) — manifest/gaps still written");
    if (ingest.stderr) console.warn(ingest.stderr.slice(0, 800));
  }
} else {
  console.log("[nelvyon-knowledge-sync] skip ingest (set NELVYON_KNOWLEDGE_INGEST=1 when local-ai Postgres is up)");
}

process.exit(0);
