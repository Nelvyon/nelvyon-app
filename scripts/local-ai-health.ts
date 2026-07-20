#!/usr/bin/env node
/**
 * SSOT entrypoint: `node scripts/local-ai-health.mjs`
 * Prefer that over this file. Kept as a thin alias for older docs (`tsx …/local-ai-health.ts`).
 */
import { runLocalAiHealthCheck } from "../backend/local-ai/LocalAiHealth";
import { closeLocalAiPool } from "../backend/local-ai/db";

async function main(): Promise<void> {
  const report = await runLocalAiHealthCheck();
  await closeLocalAiPool();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
