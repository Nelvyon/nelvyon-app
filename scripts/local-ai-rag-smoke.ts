import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { closeLocalAiPool } from "../backend/local-ai/db";
import { getLocalVectorStore } from "../backend/local-ai/LocalVectorStore";
import { getRagIngestPipeline } from "../backend/local-ai/RagIngestPipeline";

async function main(): Promise<void> {
  const tenantId = randomUUID();
  const storageDir = path.resolve("backend/local-ai/storage");
  await fs.mkdir(storageDir, { recursive: true });
  const docPath = path.join(storageDir, "rag-smoke-nelvyon.txt");
  await fs.writeFile(
    docPath,
    `NELVYON Private AI — documento de prueba RAG.
La plataforma ofrece CRM, campañas email, workflows y packs de crecimiento B2B.
El stack local usa PostgreSQL 16 con pgvector en 127.0.0.1:5434.
PRIVATE_MODE bloquea APIs públicas y permite solo localhost y redes Docker privadas.
Este párrafo contiene el código secreto de validación: NELVYON-RAG-SMOKE-2026.`,
    "utf8",
  );

  const pipeline = getRagIngestPipeline();
  const ingested = await pipeline.ingestFile({
    tenantId,
    sourceId: "rag-smoke-doc",
    title: "RAG Smoke Test",
    filePath: docPath,
  });

  const store = getLocalVectorStore();
  const hits = await store.search({
    tenantId,
    query: "código secreto validación RAG",
    limit: 3,
  });

  const chunkCount = await store.countChunks(tenantId);
  const top = hits[0];
  const ok =
    ingested.chunks >= 1 &&
    chunkCount >= 1 &&
    Boolean(top?.content.includes("NELVYON-RAG-SMOKE-2026"));

  console.log(
    JSON.stringify(
      {
        ok,
        tenantId,
        ingested,
        chunkCount,
        topScore: top?.score,
        topPreview: top?.content?.slice(0, 120),
      },
      null,
      2,
    ),
  );

  await closeLocalAiPool();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await closeLocalAiPool();
  process.exit(1);
});
