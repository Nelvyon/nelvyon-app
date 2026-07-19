import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { closeLocalAiPool } from "../backend/local-ai/db";
import { getKnowledgeIngestService } from "../backend/local-ai/KnowledgeIngestService";
import { buildKnowledgeManifest, manifestSummary, relativeManifestPath } from "../backend/local-ai/specialization/knowledgeManifest";
import { NELVYON_ONTOLOGY } from "../backend/local-ai/specialization/ontology";

import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "backend/local-ai/knowledge");
const manifestPath = path.join(outDir, "manifest.json");
const ontologyPath = path.join(outDir, "ontology.json");
const tenantFile = path.join(outDir, "tenant.id");

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
  await closeLocalAiPool();
  process.exit(report.ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await closeLocalAiPool();
  process.exit(1);
});
