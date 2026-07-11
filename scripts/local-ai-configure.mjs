#!/usr/bin/env node
/** Apply Ollama winners from latest benchmark JSON to backend/local-ai/.env.local */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const benchDir = path.join(root, "..", "backend", "local-ai", "benchmarks");
const envPath = path.join(root, "..", "backend", "local-ai", ".env.local");

const files = (await fs.readdir(benchDir).catch(() => []))
  .filter((f) => f.startsWith("benchmark_") && f.endsWith(".json"))
  .sort()
  .reverse();
if (!files[0]) {
  console.error("No benchmark JSON found. Run: node scripts/local-ai-benchmark.mjs");
  process.exit(1);
}

const report = JSON.parse(await fs.readFile(path.join(benchDir, files[0]), "utf8"));
const llm = report.winners?.llm?.model;
const embed = report.winners?.embed?.model;
if (!llm || !embed) {
  console.error("Benchmark missing winners");
  process.exit(1);
}

const content = `# Auto-generated from ${files[0]} — ${report.timestamp}
PRIVATE_MODE=ON
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=${llm}
LOCAL_AI_EMBEDDING_MODEL=${embed}
LOCAL_AI_EMBEDDING_DIM=${report.winners.embed.dim ?? 768}
LOCAL_AI_DATABASE_URL=postgresql://nelvyon_local_app:nelvyon_local_app_dev@127.0.0.1:5434/nelvyon_local_ai
PRIVATE_MODE_ALLOWED_HOSTS=openclaw,nelvyon-local-ai-postgres
`;

await fs.writeFile(envPath, content, "utf8");
console.log(`LOCAL_AI_CONFIGURE_OK ${envPath}`);
console.log(`OLLAMA_MODEL=${llm}`);
console.log(`LOCAL_AI_EMBEDDING_MODEL=${embed}`);
