/**
 * Local AI stack configuration — owner machine only.
 */
export type LocalAiConfig = {
  databaseUrl: string;
  embeddingDim: number;
  ollamaBaseUrl: string;
  ollamaModel: string;
  /** Optional heavier model for strategy/planning generation only (hybrid pipeline). */
  strategyModel?: string;
  strategyNumGpu?: number;
  embeddingModel: string;
  storageDir: string;
  backupDir: string;
  dockerContainer: string;
};

const DEFAULT_DB =
  "postgresql://nelvyon_local_app:nelvyon_local_app_dev@127.0.0.1:5434/nelvyon_local_ai";

export function getLocalAiConfig(): LocalAiConfig {
  const strategyModel =
    process.env.OLLAMA_STRATEGY_MODEL?.trim() ||
    process.env.BENCHMARK_STRATEGY_MODEL?.trim() ||
    undefined;
  const strategyNumGpuRaw = process.env.OLLAMA_STRATEGY_NUM_GPU ?? process.env.OLLAMA_NUM_GPU;

  // Prefer LOCAL_AI_DATABASE_URL; optionally reuse shared DATABASE_URL when
  // NELVYON_LOCAL_AI_USE_MAIN_DB=1 (Railway staging shared-DB path, ADR-065/068).
  let databaseUrl = process.env.LOCAL_AI_DATABASE_URL?.trim() || "";
  if (!databaseUrl) {
    const useMain = (process.env.NELVYON_LOCAL_AI_USE_MAIN_DB ?? "").trim() === "1";
    const main = (process.env.DATABASE_URL ?? "").trim();
    if (useMain && main) databaseUrl = main;
  }
  if (!databaseUrl) databaseUrl = DEFAULT_DB;

  return {
    databaseUrl,
    embeddingDim: Number(process.env.LOCAL_AI_EMBEDDING_DIM ?? 768),
    ollamaBaseUrl: (
      process.env.OLLAMA_HOST?.trim() ||
      process.env.OLLAMA_BASE_URL?.trim() ||
      process.env.NELVYON_LOCAL_AI_URL?.trim() ||
      "http://127.0.0.1:11434"
    ).replace(/\/$/, ""),
    ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.2:3b-instruct-q4_K_M",
    strategyModel,
    strategyNumGpu: strategyNumGpuRaw ? Number(strategyNumGpuRaw) : strategyModel ? 22 : undefined,
    embeddingModel: process.env.LOCAL_AI_EMBEDDING_MODEL ?? "nomic-embed-text",
    storageDir: process.env.LOCAL_AI_STORAGE_DIR ?? "./backend/local-ai/storage",
    backupDir: process.env.LOCAL_AI_BACKUP_DIR ?? "./backend/local-ai/backups",
    dockerContainer: process.env.LOCAL_AI_DOCKER_CONTAINER ?? "nelvyon-local-ai-postgres",
  };
}

export function resetLocalAiConfigForTests(): void {
  delete process.env.LOCAL_AI_DATABASE_URL;
  delete process.env.LOCAL_AI_EMBEDDING_DIM;
  delete process.env.LOCAL_AI_EMBEDDING_MODEL;
}
