import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { closeLocalAiPool } from "../backend/local-ai/db";
import { getKnowledgeIngestService } from "../backend/local-ai/KnowledgeIngestService";
import { getLocalVectorStore } from "../backend/local-ai/LocalVectorStore";
import { buildKnowledgeManifest, manifestSummary, relativeManifestPath } from "../backend/local-ai/specialization/knowledgeManifest";
import { NELVYON_ONTOLOGY } from "../backend/local-ai/specialization/ontology";

import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "backend/local-ai/knowledge");
const manifestPath = path.join(outDir, "manifest.json");
const ontologyPath = path.join(outDir, "ontology.json");
const tenantFile = path.join(outDir, "tenant.id");
const evidencePath = path.join(repoRoot, "backend/local-ai/benchmarks/knowledge_ingest_evidence.json");

async function resolveTenantId(): Promise<string> {
  if (process.env.LOCAL_AI_TENANT_ID) return process.env.LOCAL_AI_TENANT_ID;
  try {
    return (await fs.readFile(tenantFile, "utf8")).trim();
  } catch {
    const id = randomUUID();
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(tenantFile, id, "utf8");
    return id;
  }
}

async function writeIngestEvidence(opts: {
  tenantId: string;
  report: { ok: boolean; ingested: number; skipped: number; failed: number };
  chunkCount: number;
}): Promise<void> {
  const now = new Date().toISOString();
  let prior: Record<string, unknown> = {};
  try {
    prior = JSON.parse(await fs.readFile(evidencePath, "utf8")) as Record<string, unknown>;
  } catch {
    /* first write */
  }
  const verified = opts.report.ok && opts.chunkCount > 0;
  const evidence = {
    ...prior,
    generatedAt: now,
    ok: verified,
    verified,
    tenantId: opts.tenantId,
    pipeline: [
      "manifest",
      "ingest",
      "embeddings",
      "vector_store",
      "unified_rag",
      "agent_context_engine",
    ],
    checks: {
      ...(typeof prior.checks === "object" && prior.checks ? prior.checks : {}),
      manifestBuild: "ok",
      ingest: opts.report.ok ? "ok" : "failed",
      vectorStoreChunks: opts.chunkCount,
      ingestReport: {
        ingested: opts.report.ingested,
        skipped: opts.report.skipped,
        failed: opts.report.failed,
      },
    },
    blocker: verified
      ? null
      : opts.chunkCount === 0
        ? "Ingest finished but vector store has 0 active chunks"
        : "Ingest reported failures",
    claimComplete: false,
  };
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Evidence: verified=${verified} chunks=${opts.chunkCount} → ${evidencePath}`);
}

async function main(): Promise<void> {
  const tenantId = await resolveTenantId();
  const manifest = buildKnowledgeManifest();
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(ontologyPath, JSON.stringify(NELVYON_ONTOLOGY, null, 2));
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        tenantId,
        entries: manifest.map((e) => ({ ...e, path: relativeManifestPath(e.path) })),
        summary: manifestSummary(manifest),
      },
      null,
      2,
    ),
  );

  console.log(`Manifest: ${manifest.length} sources → ${manifestPath}`);
  const report = await getKnowledgeIngestService().ingestManifest(tenantId);
  console.log(JSON.stringify({ tenantId, ...report }, null, 2));
  const chunkCount = await getLocalVectorStore().countChunks(tenantId);
  await writeIngestEvidence({ tenantId, report, chunkCount });
  await closeLocalAiPool();
  process.exit(report.ok && chunkCount > 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await closeLocalAiPool();
  process.exit(1);
});
