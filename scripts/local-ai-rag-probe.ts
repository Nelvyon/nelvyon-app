import { getLocalRagRetriever } from "../backend/local-ai/LocalRagRetriever";
import { closeLocalAiPool } from "../backend/local-ai/db";

async function main(): Promise<void> {
  const tenantId = process.argv[2];
  const query = process.argv[3];
  if (!tenantId || !query) {
    console.error("Usage: tsx scripts/local-ai-rag-probe.ts <tenantId> <query>");
    process.exit(1);
  }
  const r = await getLocalRagRetriever().retrieve(tenantId, query, { limit: 4 });
  console.log(JSON.stringify(r));
  await closeLocalAiPool();
}

main().catch(async (e) => {
  console.error(e);
  await closeLocalAiPool();
  process.exit(1);
});
