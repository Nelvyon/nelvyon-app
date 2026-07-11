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
